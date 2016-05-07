var express = require("express");
var app = express();

var paperwork = require("paperwork");
var passport = require("passport");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session")
var config = require("./config.js");

var server;
var controllers = {};

// Create database controller
controllers.Sequelize = require("./server/controllers/SequelizeController.js")(config);
var sequelize = controllers.Sequelize;

// Use middleware for requests, cookies, sessions etc.
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session
({
	secret: config.session.secret,
	resave: false,
	saveUninitialized: true
}))

// Initialize passport and restore session if available
app.use(passport.initialize());
app.use(passport.session());

// Bundle the core components
var core =
{
	app: app,
	sequelize: sequelize,
	paperwork: paperwork,
	passport: passport,
	config: config,
};

// Create workspace controllers
controllers.User = require("./server/controllers/UserController.js")(core);
controllers.Track = require("./server/controllers/TrackController.js")(core);
controllers.Content = require("./server/controllers/ContentController.js")(core);
controllers.Playlist = require("./server/controllers/PlaylistController.js")(core);
controllers.Item = require("./server/controllers/ItemController.js")(core);
controllers.Relation = require("./server/controllers/RelationController.js")(core);
controllers.Search = require("./server/controllers/SearchController.js")(core);

// Use public folder as the public application root
app.use(express.static(__dirname + "/public"));
app.use(function(req, res)
{
	res.sendFile("index.html", { root: __dirname + "/public" });
});

// Create required database tables
sequelize
	.sync()
	.then(onSequelizeSync);

// Sequelize ready for use
function onSequelizeSync()
{
	var Track = sequelize.models.Track;
	var Playlist = sequelize.models.Playlist;

	// Create a track that newly created content is linked with
	Track.findOrCreate
	({
		where:
		{
			trackId: -1,
			artist: "Unknown Artist",
			title: "Unknown Track"
		}
	});

	server = app.listen(config.server.port, onRaesonicInit);
}

// Application ready for use
function onRaesonicInit()
{
	var port = server.address().port;
	console.log("Raesonic initiated. Selected port: %s.", port);
}
