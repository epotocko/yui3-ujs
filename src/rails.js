(function() {

// Add support for bubbling submit events in IE
// http://yuilibrary.com/projects/yui3/ticket/2528683
YUI.add('rails-event-bubble', function(Y) {

	// TODO: replace with http://yuilibrary.com/projects/yui3/ticket/2529119
	// Technique from Juriy Zaytsev
	// http://thinkweb2.com/projects/prototype/detecting-event-support-without-browser-sniffing/
	function isEventSupported(eventName) {
		var el = document.createElement('div');
		eventName = 'on' + eventName;
		var isSupported = (eventName in el);
		if (!isSupported) {
			el.setAttribute(eventName, 'return;');
			isSupported = typeof el[eventName] == 'function';
		}
		el = null;
		return isSupported;
	}

	var submitBubbles = isEventSupported('submit');
	var EMULATED_SUBMIT = 'emulated:submit';
		
	if(!submitBubbles) {
		Y.Event.define('submit', {

			on: function(node, sub, notifier) {
				sub.onHandle = Y.Event._attach(['submit', function(e) { 
					notifier.fire.apply(notifier, arguments); 
				}, node, this], { capture: true });
			},

			detach: function(node, sub) {
				sub.onHandle.detach();
			},

			delegate: function(node, sub, notifier, filter) {
				var compiledFilter = Y.delegate.compileFilter(filter);
				sub.delegateHandle = Y.on(EMULATED_SUBMIT, function(e) {
					if(compiledFilter(e.target, {currentTarget: node})) {
						var submitEvent = e.details[0];
						var ret = notifier.fire.apply(notifier, arguments);
						if(e.prevented) submitEvent.preventDefault();
					}
				});
			},

			detachDelegate: function(node, sub, notifier, filter) {
				sub.delegateHandle.detach();
			}

		}, true);

		// Discover elements that support onsubmit and onchange by listening to the focus event
		Y.one(document).delegate('focus', function(focusEvent) {
			// listen to the submit event if this input is in a form
			var form = this.ancestor('form');
			if (form && !form.getData(EMULATED_SUBMIT)) {
				form.publish(EMULATED_SUBMIT, {broadcast: 1});
				form.on('submit', function(e) {
					return form.fire(EMULATED_SUBMIT, e);
				});
				form.setData(EMULATED_SUBMIT, true);
			}
		}, 'form input, form select, form button, form textarea');
	}

}, '0.0.1', { requires: ['event-delegate', 'event-focus', 'event-synthetic'] });

var AJAX_EVENTS = ['before', 'after', 'create', 'complete', 'success', 'failure'];

YUI.add('rails-ujs', function(Y) {
	// Adds support for broadcasting ajax events globally on node instances
	function defineEvent(evtName) {
		Y.Event.define(evtName, {
			on: function(node, sub, notifier) {
				sub.handle = Y.Global.on(evtName, function(e) {
					if(Y.Node.getDOMNode(e.target) == Y.Node.getDOMNode(node)) {
						notifier.fire.apply(notifier, arguments);
					}
				});
			},

			detach: function(node, sub) {
				sub.handle.detach();
			},
			
			delegate: function(node, sub, notifier, filter) {
				var compiledFilter = Y.delegate.compileFilter(filter);
				sub.handle = Y.Global.on(evtName, function(e) {
					if(compiledFilter(e.target, {currentTarget: node})) {
						notifier.fire.apply(notifier, arguments);
					}
				});
			},

			detachDelegate: function(node, sub, notifier, filter) {
				sub.handle.detach();
			}

		}, true);
	}

	for(var i = 0; i < AJAX_EVENTS.length; i++) {
		defineEvent('ajax:' + AJAX_EVENTS[i]);
	}

}, '0.0.1', { requires: ['node-base', 'event-synthetic'] });


YUI().use('node-base', 'node-event-delegate', 'io-form', 'rails-ujs', 'rails-event-bubble', function(Y) {

	var doc = Y.one(document);

	/**
	 * data-confirm
	 */

	doc.delegate('click', function(e) {
		var message = this.getAttribute('data-confirm');
		if(!(!message || confirm(message))) {
			e.preventDefault();
			return false;
		}
	}, 'a[data-confirm],input[data-confirm],button[data-confirm]');


	/**
	 * data-remote
	 */

	function handleRemote(e) {
		var element = this;
		for(var i = 0; i < AJAX_EVENTS.length; i++) {
			element.publish('ajax:' + AJAX_EVENTS[i], {broadcast: 2});
		}

		var url, cfg = {};
		var event = element.fire('ajax:before');

		if (element.get('tagName').toLowerCase() === 'form') {
			cfg.method = element.get('method') || 'post';
			url = element.get('action');
			// form elements need to have an id for yui to serialize them
			if(!element.get('id')) element.setAttribute('id', Y.guid('remoteForm'));
			cfg.form = { id: element.get('id') };
		}
		else {
			cfg.method = element.getAttribute('data-method') || 'get';
			url = element.get('href');
		}
		
		cfg.on = {
			start:    function(tid, response) { element.fire('ajax:create', {}, response); },
			complete: function(tid, response) { element.fire('ajax:complete', {}, response); },
			success:  function(tid, response) { element.fire('ajax:success', {}, response); },
			failure:  function(tid, response) { element.fire('ajax:failure', {}, response); }
		};
		
		Y.io(url, cfg);
		
		element.fire('ajax:after');
		e.preventDefault();
	}

	doc.delegate('submit', handleRemote, 'form[data-remote]');
	doc.delegate('click', handleRemote, 'a[data-remote]');
	
	/**
	 * data-method
	 */

	function insertHiddenField(form, name, value) {
		form.insert(Y.Node.create('<input/>').setAttrs({ type: 'hidden', name: name, value: value }));
	}

	function handleMethod(e) {
		var element = this,
			method = element.getAttribute('data-method'),
			url = element.get('href'),
			csrfParam = Y.one('meta[name=csrf-param]'),
			csrfToken = Y.one('meta[name=csrf-token]');
		
		var form = Y.Node.create('<form method="POST" style="display:none"></form>').setAttribute('action', url);
		element.get('parentNode').insert(form);

		if (method !== 'post') {
			insertHiddenField(form, '_method', method);
		}
		if (csrfParam && csrfToken) {
			insertHiddenField(form, csrfParam.getAttribute('content'), csrfToken.getAttribute('content'));
		}
		form.submit();
		e.preventDefault();
	}
	 
	doc.delegate('click', handleMethod, 'a[data-method]:not([data-remote])');


	/**
	 * disable-with
	 */
	var DISABLE_WITH_SELECTOR = 'input[type=submit][data-disable-with]';
	
	function disableFormElements() {
		this.all(DISABLE_WITH_SELECTOR).each(function(element) {
			element.setData('enable-with', element.get('value'));
			element.set('value', element.getAttribute('data-disable-with'));
			element.setAttribute('disabled', 'disabled');
		});
	}

	function enableFormElements() {
		this.all(DISABLE_WITH_SELECTOR).each(function(element) {
			element.removeAttribute('disabled')
			element.set('value', element.getData('enable-with'));
		});
	}

	doc.delegate('submit', disableFormElements, 'form:not([data-remote])');
	doc.delegate('ajax:before', disableFormElements, 'form[data-remote]');
	doc.delegate('ajax:complete', enableFormElements, 'form[data-remote]');
});

})();