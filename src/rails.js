(function() {

var AJAX_EVENTS = ['before', 'after', 'create', 'complete', 'success', 'failure'];

YUI.add('rails', function(Y) {

	function defineEvent(evtName) {
		Y.Event.define(evtName, {
			on: function(node, sub, notifier) {
				console.log(sub);
				sub._handle = Y.Global.on(evtName, function(e) {
					if(Y.Node.getDOMNode(e.target) == Y.Node.getDOMNode(node)) {
						notifier.fire.apply(notifier, arguments);
					}
				});
			},

			detach: function(node, sub) {
				sub._handle.detach();
			},
			
			delegate: function(node, subscription, notifier, filter) {
				sub._handle = Y.Global.delegate(evtName, function(e) {
					if(Y.Node.getDOMNode(e.target) == Y.Node.getDOMNode(node)) {
						notifier.fire.apply(notifier, arguments);
					}
				}, filter);
			},

			detachDelegate: function(node, subscription, notifier, filter) {
				sub._handle.detach();
			}

		}, true);
	}

	for(var i = 0; i < AJAX_EVENTS.length; i++) {
		defineEvent('ajax:' + AJAX_EVENTS[i]);
	}

}, '3.2.0', { requires: ['node', 'event-synthetic'] });


YUI(typeof YUI_CONFIG != 'undefined' ? YUI_CONFIG : {}).use('event', 'event-custom', 'event-delegate', 'node', 'io-form', 'rails', function(Y) {

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
	}, 'a[data-confirm],input[data-confirm]');


	/**
	 * data-remote
	 */

	function handleRemote(element) {
		for(var i = 0; i < AJAX_EVENTS.length; i++) {
			element.publish('ajax:' + AJAX_EVENTS[i], {broadcast: 2});
		}

		var url, cfg = {};
		var event = element.fire('ajax:before');

		if (element.get('tagName').toLowerCase() === 'form') {
			cfg.method = element.get('method') || 'post';
			url = element.get('action');
			if(!element.get('id')) element.setAttribute('id', Y.guid('remoteForm'));
			cfg.form = { id: element.get('id') };
		}
		else {
			cfg.method = element.getAttribute('data-method') || 'get';
			url = element.get('href');
		}
		
		cfg.on = {
			start: 	  function(tid, response) { element.fire('ajax:create', {}, response); },
			complete: function(tid, response) { element.fire('ajax:complete', {}, response); },
			success:  function(tid, response) {	element.fire('ajax:success', {}, response); },
			failure:  function(tid, response) { element.fire('ajax:failure', {}, response); }
		};
		
		Y.io(url, cfg);
		
		element.fire('ajax:after');
	}

	doc.delegate('submit', function(e) {
		handleRemote(this);
		e.preventDefault();
	}, 'form[data-remote]');
	
	doc.delegate('click', function(e) {
		handleRemote(this);
		e.preventDefault();
	}, 'a[data-remote],input[data-remote]');

	
	/**
	 * data-method
	 */

	function insertHiddenField(form, name, value) {
		form.insert(Y.Node.create('<input/>').setAttrs({ type: 'hidden', name: name, value: value }));
	}

	function handleMethod(element) {
		var method = element.getAttribute('data-method'),
			url = element.get('href'),
			csrfParam = Y.one('meta[name=csrf-param]'),
			csrfToken = Y.one('meta[name=csrf-token]');
		
		var form = Y.Node.create('<form method="POST" style="display:none"></form>').setAttribute('action', url);
		element.get('parentNode').insert(form);

		if (method !== 'post') {
			insertHiddenField(form, '_method', method);
		}
		if (csrfParam) {
			insertHiddenField(form, csrfParam.getAttribute('content'), csrfToken.getAttribute('content'));
		}
		form.submit();
	}
	 
	doc.delegate('click', function() {
		handleMethod(this);
		e.preventDefault();
	}, 'a[data-method]:not([data-remote])');


	/**
	 * disable-with
	 */

	var DISABLE_WITH_INPUT_SELECTOR           = 'input[data-disable-with]',
		DISABLE_WITH_FORM_REMOTE_SELECTOR     = 'form[data-remote]:has('       + DISABLE_WITH_INPUT_SELECTOR + ')',
		DISABLE_WITH_FORM_NOT_REMOTE_SELECTOR = 'form:not([data-remote]):has(' + DISABLE_WITH_INPUT_SELECTOR + ')';

	var disableWithInputSelector = function() {
		this.all(DISABLE_WITH_INPUT_SELECTOR).each(function(element) {
			element.setData('enable-with', element.get('value'))
				.set('value', element.getAttribute('data-disable-with'))
				.setAttribute('disabled', 'disabled');
		});
	};

	doc.delegate('ajax:before', disableWithInputSelector, DISABLE_WITH_FORM_REMOTE_SELECTOR);
	doc.delegate('submit', disableWithInputSelector, DISABLE_WITH_FORM_NOT_REMOTE_SELECTOR);

	doc.delegate('ajax:complete', function() {
		this.all(DISABLE_WITH_INPUT_SELECTOR).each(function(element) {
			element.removeAttribute('disabled').set('value', element.getData('enable-with'));
		});
	}, DISABLE_WITH_FORM_REMOTE_SELECTOR);

});

})();