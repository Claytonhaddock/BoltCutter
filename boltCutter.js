var fs = require('fs-extra');
var unzip = require('unzip2');
var _ = require('underscore');
var cheerio = require('cheerio');
var css = require('css');//==============maybe not
var $; 
var data;
var filePaths = [];
var doc_root =[];
var badScripts = ['ebloader.js'];
var htmlFile;
var inputFile = process.argv[3];
var base;

var extType = checkInputType(inputFile);
runProcess(extType);

function checkInputType(_inputFile){
	for(var j = _inputFile.length; j>0;j--){
		if(_inputFile[j]=="."){
			var ext = _inputFile.slice(j+1,_inputFile.length);
			if(ext == 'html'){
				return 'html'; 
			} else if(ext == 'zip'){
				return 'zip';
			}else if(inputFile.indexOf('.') == -1){
				console.log("This needs to a zipped directory or an html file. Quitting boltCutter.")
				process.exit();
			}
		}
	}
}

function runProcess(_ext){
	if(!fs.existsSync('export')){
		fs.mkdirSync('export');
	} else {
		fs.removeSync('export');
		fs.mkdirSync('export');
	}
	if(_ext == 'html'){
		htmlFile = inputFile;
		var data = fs.readFileSync(inputFile, 'utf8');
		handleHTMLFileInput(data);
	} else if(_ext == 'zip'){
		unZip_();
	}
}

function unZip_(){
	fs.createReadStream(inputFile).pipe(unzip.Extract({ path: 'export' })).on('close', function(){
		fs.removeSync('export/_MACOSX');
		fs.removeSync('export/__MACOSX');

		var files = fs.walkSync('export')
		files = filterFiles(files);
		moveFiles(files);
		var data = fs.readFileSync(htmlFile, 'utf8');
		handleHTMLFileInput(data);

		function filterFiles(_files){
		 	var filteredFiles = [];
			_files.forEach(function(file){
			 	var ext;
			 	for(var j = file.length; j>0;j--){
				 	if(file[j]=="."){
				 		ext = file.slice(j+1,file.length);
				 		if(ext == 'html' || ext == 'jpg' || ext == 'png' || ext == 'css' || ext == 'js' || ext == 'svg' || ext == 'gif'){
				 			filteredFiles.push(file);
				 			if(ext == 'html'){
				 				htmlFile = 'export/' + file.split('/')[file.split('/').length-1];
				 				base = file.slice(7).split('/').slice(0, file.split('/').length-2)[0]; // change this to include unlimited nested dirs
				 			} else {
				 				filePaths.push(file.slice(7));
				 			}
				 		} 
					} 
				}	
			})
			return filteredFiles;
		}

		function moveFiles(_files){
			var dirs = [];
			_files.forEach(function(file){
				fs.copySync(file, 'export/' + file.split('/')[file.split('/').length-1]);
				dirs.push(file.split('/')[1]);
			 });
			removeDirs(dirs);
		}

		function removeDirs(DirPaths){
			var DirPaths = _.uniq(DirPaths, false);	
			DirPaths.forEach(function(filePath){
				if(filePath != 'export'){
					fs.removeSync('export/' + filePath);
				}
			})
		}
	});
}

//===== check to see if URL argument is between parenthesis. If it is
// then parentheses are stripped away.

function handleHTMLFileInput(_data){
	$ = cheerio.load(_data);
	fs.removeSync(htmlFile);
	if(fs.existsSync('export/index.html')){
		fs.removeSync('export/index.html');
	}
	var newURL = process.argv[2];
	if(newURL != undefined){ 
		if(newURL.slice(0,1) =="'" || newURL.slice(0,1) ==='"'){
		newURL = newURL.slice(1,newURL.length-1);
		}
	} else {
		console.log("You must enter a URL after the file location! ex. node script.js www.google.com");
		process.exit();
	}

	var bodyContent;
	var mraid = false;
	var scriptExists = false;
	//===== Checks to see if script exists on page ======
	// ===== if script doesn't exist then prints script  =====
	// ===== loops through array and removes all matching script tags ===
		//checkScript(['ebloader.js']);
		checkStructure();
		// insertContent();
		// insertMRAID();
		// removeOnclick();
		// render();


	//======= prints script to page =======
	function checkScript(arr){
		
		var mraidScript = '\n' + '<script type="text/javascript">' +  '\n' +
		'    (function(){' +  '\n' +
		'       var wrapper = document.getElementById("wrapper"); ' + '\n' +
		'        var MRAID = window["mraid"];' + '\n' +
		'        var url=' +"'" + encodeURIComponent(process.argv[2]) + "';" + '\n' +
		'        function init(){' + '\n' +
		'           if (MRAID){' + '\n' +
		'              MRAID.removeEventListener("ready", init);' + '\n' +
		'           } else {' + '\n' +
		"               window.removeEventListener('load', init);" + '\n' +
		'           }' + '\n' +
		"           wrapper.addEventListener('click', function(){" + '\n' +               
		'              if (MRAID && MRAID.open){' + '\n' +
		'                MRAID.open( url );' + '\n' +
		'             } else {' + '\n' +
		'                 window.open( url );' + '\n' +
		'              }' +    '\n' +
		'           },false);' + '\n' +
		'        }' + '\n' +
		'        function checkEnvironment(){' + '\n' +
		'                if (MRAID){' + '\n' +
		"                    if (MRAID.getState() == 'loading'){" + '\n' +
		'                        MRAID.addEventListener("ready", init);' + '\n' +
		'                   } else {' + '\n' +
		'                        init();' + '\n' +
		'                    }' + '\n' +
		'               } else {' + '\n' +
		'                if(document.readyState === "complete"){' + '\n' +
		'                    init()' + '\n' +
		'                }else{' + '\n' +
		"                    window.addEventListener('load', init, false);" + '\n' +
		'                }' + '\n' +
		'           }'+ '\n' +
		'        }' + '\n' +
		'        checkEnvironment();' + '\n' +
		'    })()' + '\n' +
		'</script>'

		$('script').each(function(elmt){
			//check to see if MRAID code already exists
			if($(this).text().indexOf('var MRAID = window["mraid"]' != -1)){
				scriptExists = true;
			}
			var loopObj = $(this)
			//====== check to see if ebloader is pulled in and remove it ====
			arr.forEach(function(scrpt){
				if(fs.existsSync('export/' + scrpt)){
					fs.removeSync('export/' + scrpt);
				}
				if(loopObj.attr('src') != undefined){
					//console.log(loopObj.attr('src'));
					if(loopObj.attr('src').toLowerCase().indexOf(scrpt) != -1){
						//console.log(loopObj.attr('src'), "should have been removed");
						loopObj.remove();
					}
				}
			})	
		})
		if(scriptExists && doc_root[doc_root.length-1] != 'root'){
			console.log(doc_root[0])
			console.log('checkscript done');
			$(doc_root[doc_root.length-1]).append(mraidScript);
		} else {
			$.root().append(mraidScript);
		}	
		insertContent();
		insertMRAID();
		removeOnclick();
		render();
	}

	//Insert MRAID call
	function insertMRAID(){
		$('head').replaceWith("");
		$.root().prepend('<script src="mraid.js"></script>')
	}

	//========== Replaces all nested filepaths to snippet root directory ========
	function changeFilePaths(arr, str){
		var _str = str;
		arr.forEach(function(path){
			var replace = path.replace(base, '').split('/')[path.replace(base, '').split('/').length-1];
			var search = path.replace(base, '').split('/').join('/').slice(1);
			_str = _str.replace(search, replace);
		})
		return _str;
	}

	//check if a body tag exists on the page. If true then grab all the children of that element
	//removes all inline onclick attributes

	function removeOnclick(){
		$('*').each(function(){
			$(this).removeAttr('onclick');
		})
	}

	function checkStructure(){
		if($('body').length){
			console.log("body element exists");
			bodyContent = $('body').children();
			doc_root.push('body');
			if($('html').length){
				doc_root.push('html');
				console.log('checkStructure done');
			}
		} else {
			console.log("there is no body");
			if($('html').length){
			//if body doesn't exist then search for an html tag
				bodyContent = $('html').children('div');
				$('html').children('div').remove();
				console.log('html element exists');

			} else if($.root().first('div')){
				doc_root.push('root');
				console.log("there's no html element.")
				bodyContent = $('div').get(0);
				bodyContent = $.root().children('div');
				$.root().children('div').remove();
			}
		}
		checkScript(badScripts);
	}

	//========= remove body,meta, and title tags=======
	//====create wrapper div and place body content inside====

	function insertContent(){
		var allContent;
		if(doc_root[doc_root.length-1] != 'root'){
			allContent = $(doc_root[doc_root.length-1]).children();
		} else {
			allContent = $.root().append(mraidScript);
		}	
		var style = $('style');
		var styles = $('style').html();
		//console.log(style.html());
		var styling = css.parse(styles);

			for(var i = 0; i< styling.stylesheet.rules.length; i++){
				checkProp(styling.stylesheet.rules[i])
			}

			//========= remove global div declarations that access elements above stage ======
			function checkProp(obj){
				if(obj.type == 'rule'){
					if(obj.selectors.indexOf('div') > -1){
						for(var j = 0; j < obj.declarations.length; j++){
							if(obj.declarations[j].property == 'position' && obj.declarations[j].value == 'absolute'){
								 obj.selectors.splice(obj.selectors.indexOf('div'),1, '#wrapper div :not(script)');
							}
						}
					}
				}
			}


			styles = css.stringify(styling);
			//console.log(style);




		$.root().prepend('\n' + '\n' + '<div id="wrapper"></div>')
		$('#wrapper').append('\n' + '\t' + bodyContent + '\n');
		$('html').replaceWith(allContent);
		$('body').remove();
		$('meta').remove();
		$('title').remove();
		$('doctype').remove();

		$.root().prepend('\n' + '<style>' + '\n' +
				'   #wrapper {' + '\n' +
				'      width: 100%;' + '\n' +
				'      height: 100%;' + '\n' +
				'      position: relative;' + '\n' +
				'      top: 0; left: 0;' + '\n' +
				'      z-index: 90;' + '\n' +
				'   }' + '\n' + styles + '\n' + '</style>');
		style.remove();
		while($('head').children().length>0){
			var headContent = $('head').children().last();
				$.root().prepend('\n' + headContent);
				$('head').children().last().remove();
		}
	}

	function render(){
		//=== convert virtual dom into string=====
		var renderedDom = $.html();
		//==========replace old file paths will flatten paths======
		renderedDom = changeFilePaths(filePaths, renderedDom);
		//======= search for doctype and remove========
		if(renderedDom.toLowerCase().indexOf('<!doctype html>')== -1){
			console.log("File has been created 'snippet.html'");
			fs.writeFile('export/snippet.html', renderedDom, function (err) {
		  		if (err) return console.log(err);
			});
		} else {
			renderedDom = renderedDom.replace(/<!doctype html>/gi,'');
			renderedDom = renderedDom.replace(/<html>/gi,'');
			renderedDom = renderedDom.replace(/<\/html>/gi,'');
			console.log("File has been created: 'snippet.html'");
			fs.writeFile( inputFile.split('/').slice(0, -1).join('/') + '/snippet.html', renderedDom, function (err) {
		  		if (err) return console.log(err);
			});
		}
	}
}