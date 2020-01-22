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
app.set('view engine', 'jade');

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
	if (!req.query.statement) {
		res.send('잘못된 요청입니다.');
	}

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

var debug = require('debug')('5minbreak-fasttext:server');
var http = require('http');
require('dotenv').config()

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Listening on ' + bind);
}

