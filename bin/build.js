#!/usr/bin/env node;

/**
 * Förbind client build script
 * 
 * @author Remy Sharp <remy@leftlogic.com>
 * @license The MIT license.
 * @copyright Copyright (c) 2010 Left Logic <remy@leftlogic.com>
 */

var fs = require('fs'),
	sys = require('sys'),
  // dummy socket io to be able to get Förbind to load and retrieve the version
	io = require('../lib/dummy-io').io,
  forbind = require('../lib/forbind').forbind,
	files = [
		'vendor/json.js',
		'vendor/socket.io/socket.io.js',
		'forbind.js'
	],	
	content = "/**\n * @license Förbind v" + forbind.version + " - Built with build.js\n*\n* Compiled with JSON and Socket.io - see http://github.com/remy/forbind for details.\n*\n*/",
	out = __dirname + '/../forbind',
	spawn = require('child_process').spawn,
	compile = spawn('java', ('-jar ' + __dirname + '/../lib/vendor/compiler.jar --compilation_level WHITESPACE_ONLY --warning_level=QUIET --charset=UTF-8 --js=' + out + '.js --js_output_file=' + out + '.min.js').split(/ /)),
	socketiolicense = "Socket.IO client:\n" + 
" @author Guillermo Rauch <guillermo@learnboost.com>\n" +
" @license The MIT license.\n" + 
" @copyright Copyright (c) 2010 LearnBoost <dev@learnboost.com>\n\n ";

sys.log('Reading files...');

files.forEach(function(file){
	var path = __dirname + '/../lib/' + file;
	sys.log (' + ' + path);
	content += fs.readFileSync(path) + "\n";
});

sys.log('Generating...');

fs.write(fs.openSync(out + '.js', 'w'), content, 0, 'utf8');
sys.log('=> ' + out + '.js');

sys.log('Compressing...');

compile.on('exit', function () {
  // manually cleaning up the comments, Socket.io's license is repeated a number of times,
  // so I'm going to remove the dupes and add some more detail
  var content = fs.readFileSync(out + '.min.js') + '';
  console.log(content.length);
  content = content.replace(/(The MIT license.\s*@copyright Copyright \(c\) 2010 LearnBoost <dev@learnboost.com>\s*)+/mg, socketiolicense);

  fs.write(fs.openSync(out + '.min.js', 'w'), content, 0, 'utf8');
  
  sys.log('Done.');
});