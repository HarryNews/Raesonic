module.exports = function(core)
{
	var ContentController =
	{
		Regex:
		{
			YouTube: /^[A-Za-z0-9_-]{11}$/,
			SoundCloud: /^\d+$/,
		}
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Item = sequelize.models.Item;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Retrieve content linked with a track
	ContentController.getTrackContent = function(req, res)
	{
		Content.all
		({
			attributes: ["sourceId", "externalId"],
			limit: 20,
			include:
			[{
				model: Track,
				where: { trackId: req.params.trackId }
			}]
		})
		.then(function(content)
		{
			var response = [];

			for(var index in content)
			{
				response.push
				([
					content[index].sourceId,
					content[index].externalId
				]);
			}
			
			res.json(response);
		});
	}

	// Change content of the playlist item
	ContentController.setItemContent = function(req, res)
	{
		// todo: return error if not logged in
		// todo: include playlist and check user for ownership

		Content.findOne
		({
			attributes: ["contentId"],
			where:
			{
				sourceId: req.body.sourceId,
				externalId: req.body.externalId
			}
		})
		.then(function(content)
		{
			// Content doesn't exist, nothing to link item with
			if(!content)
				return res.status(500).json({ errors: ["internal error"] });

			Item.update
			({
				contentId: content.contentId
			},
			{
				where: { itemId: req.params.itemId }
			})
			
			res.json( [] );
		});
	}

	// Find content by the itemId, and link it to the track with specified trackId
	ContentController.linkContent = function(itemId, trackId, res)
	{
		Content.findOne
		({
			attributes: ["contentId", "trackId"],
			include:
			[{
				model: Item,
				where: { itemId: itemId }
			}]
		})
		.then(function(content)
		{
			// Grab the current trackId before it's overwritten
			var previousTrackId = content.trackId;

			// Update trackId of the content
			Content.update
			({
				trackId: trackId
			},
			{
				where: { contentId: content.contentId }
			})
			.then(function()
			{
				// Remove the previously linked track if it has no references
				var TrackController = require("./TrackController.js")(core);
				TrackController.removeUnusedTrack(previousTrackId);

				res.json(trackId);

				// todo: use actual user id
				ContentLink.create
				({
					trackId: trackId,
					userId: 1,
					contentId: content.contentId
				});
			});
		});
	}

	// Returns true if sourceId is valid
	ContentController.validateSourceId = function(sourceId)
	{
		return (sourceId == 1 || sourceId == 2);
	};

	// Returns true if externalId is in valid range
	ContentController.validateExternalId = function(externalId)
	{
		if(!ContentController.Regex.YouTube.test(externalId) &&
			!ContentController.Regex.SoundCloud.test(externalId))
			return false;

		return true;
	}

	app.get("/tracks/:trackId(\\d+)/content",
		ContentController.getTrackContent);

	app.put("/items/:itemId(\\d+)/content",
		paperwork.accept
		({
			sourceId: paperwork.all(Number, ContentController.validateSourceId),
			externalId: paperwork.all(String, ContentController.validateExternalId),
		}),
		ContentController.setItemContent);

	return ContentController;
}
