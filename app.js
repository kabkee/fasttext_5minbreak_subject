var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
const fastText = require('fasttext');
const cors = require('cors')
var fs = require('fs');
var os = require('os');

var app = express();
app.use(cors())


// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let classifier = new fastText.Classifier();



app.get('/status', (req, res) => {
	res.send(true);
});

app.get('/training', (req, res) => {
	let inputRawData = path.resolve(path.join(__dirname, '/data/5minbreak.raw.train.txt'));
	let inputData = path.resolve(path.join(__dirname, '/data/5minbreak.train.txt'));

	var lineReader = require('readline').createInterface({
		input: fs.createReadStream(inputRawData)
	});

	var parsedInputRaw = [];
	var parsedLine;
	lineReader.on('line', function (line) {

		parsedLine = null;
		parsedLine = line.split('&quot;');
		parsedInputRaw.push(parsedLine);

		// logger.write('some data' + os.EOL) // append string to your file
		// logger.end() // close string
		// console.log('Line from file:', parsedLine);
	})
		.on('close', function (line) {
			fs.unlink(inputData, (err) => {
				if (err) {
					console.error(err)
					return;
				}

				var fileSystemInst = fs.createWriteStream(inputData, {
					flags: 'a' // 'a' means appending (old data will be preserved)
				})
	
				var newLine;
				parsedInputRaw.forEach((row, index) => {
					if (!row[3]) {
						// console.info(row);
						return;
					}
					// __label__hoonhoon 홍대 일본여성 폭행 사건의 진실
					newLine = `__label__${row[1]} ${row[3]}`;
					fileSystemInst.write(newLine + os.EOL);
				})
				fileSystemInst.end();

				let outputData = path.resolve(path.join(__dirname, '/data/5minbreak.model'));
				let config = {
					dim: 100,
					input: inputData,
					output: outputData,
				}
				classifier.train('supervised', config)
					.then((result) => {
						// console.log('success', result);
						res.send('Training Success!');
					});
			});
		});
})


app.get('/', (req, res) => {
	res.sendFile(path.resolve(path.join(__dirname, 'index.html')))
})

app.get('/fasttext', (req, res) => {
	let statement = req.query.statement
	getFastTextResults(statement, (data) => {
		// console.log(statement, data)
		res.send(data)
	});
})


function getFastTextResults(statement, callbackFnc) {
	let model = path.resolve(path.join(__dirname, '/data/5minbreak.model.bin'));
	const classifier = new fastText.Classifier(model);
	classifier.predict(statement, 3)
		.then((res) => {
			if (res.length > 0) {
				let tag = res[0].label; // __label__knives
				let confidence = res[0].value // 0.8787146210670471
				// console.log('classify', tag, confidence, res);

				if (typeof callbackFnc == 'function') {
					callbackFnc([tag, confidence, res])
				}
			} else {
				console.log('No matches');
			}
		})
}


// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
