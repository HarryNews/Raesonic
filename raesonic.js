var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var config = require("./config.js");
var server;
var controllers = {};

// Create database controller
controllers.Sequelize = require("./server/controllers/SequelizeController.js")(config);
var sequelize = controllers.Sequelize;

// Parse application/x-www-form-urlencoded and application/json
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create remaining controllers
controllers.Track = require("./server/controllers/TrackController.js")(app, sequelize);
controllers.Content = require("./server/controllers/ContentController.js")(app, sequelize);
controllers.Playlist = require("./server/controllers/PlaylistController.js")(app, sequelize);
controllers.Item = require("./server/controllers/ItemController.js")(app, sequelize);
controllers.Relation = require("./server/controllers/RelationController.js")(app, sequelize);
controllers.Search = require("./server/controllers/SearchController.js")(app, sequelize);

// Allow access to the public files
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
	})
	.then(function()
	{
		// Playlist should be created along with the user account
		// Let's make one for testing purposes until auth is done
		Playlist.findOrCreate
		({
			where:
			{
				playlistId: 1,
				userId: 1,
				name: "Main"
			}
		});
	});

	server = app.listen(config.server.port, onRaesonicInit);
}

// Application ready for use
function onRaesonicInit()
{
	var port = server.address().port;
	console.log("Raesonic initiated. Selected port: %s.", port);
}
