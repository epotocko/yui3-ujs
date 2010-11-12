require 'rubygems'
require 'sinatra'
require 'json'
require 'fileutils'

DEFAULT_YUI_VERSION = '3.2.0'
source_file = File.join(File.dirname(__FILE__),  '..', 'src', 'rails.js')
dest_file = File.join(File.dirname(__FILE__), 'public', 'vendor', 'rails.js')

before do
	FileUtils.cp(source_file, dest_file)
	params[:version] ||= DEFAULT_YUI_VERSION
	headers 'Expires' => 'Mon, 26 Jul 1997 05:00:00 GMT', 'Cache-Control' => 'no-cache'
end

get '/' do
	erb :index
end

get '/test' do
	erb :test
end

get '/demo' do
	erb :demo
end

def echo(method)
	headers 'Content-type' => 'application/json'
	{ :method => method, :params => params }.to_json
end

get '/echo' do
	echo('GET')
end

post '/echo' do
	echo('POST')
end

get '/remote' do 
	if request.xhr?
		'ajax request @ ' + DateTime.now.to_s
	else
		'non-ajax request @ ' + DateTime.now.to_s
	end
end

post '/remote' do 
	if request.xhr?
		'ajax request @ ' + DateTime.now.to_s
	else
		'non-ajax request @ ' + DateTime.now.to_s
	end
end

get '/sleep' do
	sleep(2)
	if request.xhr?
		'ajax request'
	else
		'non-ajax request'
	end
end

post '/sleep' do
	sleep(2)
	if request.xhr?
		'ajax post request, params = ' + params.inspect
	else
		'non-ajax post request'
	end
end

get '/redirect' do
	erb :redirect
end

post '/redirect' do
	erb :redirect
end

get '/error' do
	status 500
end