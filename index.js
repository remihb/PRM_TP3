/*jshint
loopfunc:true
*/

var fs = require('fs'),
	_ = require('lodash'),
	extract = require('pdf-text-extract'),
	similarity = require('compute-cosine-similarity');

var vocab = require('./dico').dico,
	vectorRef = _.fill(Array(vocab.length), 1);

var dirpath = __dirname + '/stages/';
var uniqdirpath = __dirname + '/stages_uniques/';

var deleteFolderRecursive = function(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index) {
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};
var ensureExists = function(path, mask, cb) {
	if (typeof mask == 'function') {
		cb = mask;
		mask = 0777;
	}
	fs.mkdir(path, mask, function(err) {
		if (err) {
			if (err.code == 'EEXIST') {
				deleteFolderRecursive(path);
			} else cb(err);
		} else cb(null);
	});
};

function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

var vectorSignature = function(text) {
	return new Promise(function(resolve, reject) {
		var vector = _.fill(Array(vocab.length), 0);
		for (var i = 0; i < vocab.length; i++) {
			if (_.includes(text, vocab[i])) {
				vector[i] = 1;
			}
		}
		var sim = similarity(vectorRef, vector);
		var sign = _.isNaN(sim) ? 0 : sim;
		resolve({
			sign: sign,
			text: text
		});
	});
};

var extractPdf = function(item) {
	return new Promise(function(resolve, reject) {
		var filePath = dirpath + item;
		fs.exists(filePath, function(exists) {
			if (exists) {
				extract(filePath, {
					splitPages: false
				}, function(err, text) {
					if (err) {
						resolve({
							status: 'ko',
							content: err
						});
					} else {
						vectorSignature(_.join(text, ' '))
							.then(function(res) {
								resolve({
									status: 'ok',
									content: {
										filename: item,
										sign: res.sign,
										text: res.text
									}
								});
							});
					}
				});
			} else {
				resolve({
					status: 'ko',
					content: 'no file found'
				});
			}
		});
	});
};

var uniqPdfs = function(pdfs) {
	return new Promise(function(resolve, reject) {
		resolve(_.uniqBy(pdfs, 'text'));
	});
};

var sortPdfs = function() {
	return new Promise(function(resolve, reject) {
		fs.readdir(dirpath, function(err, items) {
			var promises = [];
			for (var i = 0; i < items.length; i++) {
				promises.push(extractPdf(items[i]));
			}
			Promise.all(promises)
				.then(function(pdfs) {
					return _.map(_.remove(pdfs, function(el) {
						return el.status == 'ok';
					}), function(el) {
						return el.content;
					});
				})
				.then(function(pdfs) {
					return _.groupBy(pdfs, "sign");
				})
				.then(function(pdfs) {
					var promises = [];
					for (var sim in pdfs) {
						promises.push(uniqPdfs(pdfs[sim]));
					}
					Promise.all(promises)
						.then(function(pdfs) {
							resolve([].concat.apply([], pdfs));
						});
				})
				.catch(function(error) {
					reject(error);
				});
		});
	});
};

var writePdfs = function(pdfs) {
	return new Promise(function(resolve, reject) {
		ensureExists(uniqdirpath, 0755, function(err) {
			if (err) {
				reject(err);
			} else {
				for (var i = 0; i < pdfs.length; i++) {
					copyFile(dirpath + pdfs[i].filename, uniqdirpath + pdfs[i].filename, function(err){
						if (err){
							reject(err);
						}
					});
				}
				resolve();
			}
		});
	});
};

var execute = function() {
	deleteFolderRecursive(uniqdirpath);
	return new Promise(function(resolve, reject) {
		sortPdfs()
			.then(function(pdfs) {
				writePdfs(pdfs)
					.then(function() {
						resolve('all pdfs write');
					})
					.catch(function(error) {
						reject(error);
					});
			})
			.catch(function(error) {
				reject(error);
			});
	});
};

var start = new Date();

execute()
	.then(function(result) {
		setTimeout(function() {
			var end = new Date() - start;
			console.info("Execution time: %dms", end);
		}, 1000);
		console.log(result);
	})
	.catch(function(error) {
		console.log(error);
	});
