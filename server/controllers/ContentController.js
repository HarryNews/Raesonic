module.exports = function(core)
{
	var ContentController =
	{
		REGEX:
		{
			YOUTUBE: /^[A-Za-z0-9_-]{11}$/,
			SOUNDCLOUD: /^\d+$/,
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
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var PlaylistController = core.controllers.Playlist;
		
		PlaylistController.verifyOwnership(req.user, PlaylistController.BY_ITEMID, req.params.itemId, res,
		function onConfirm()
		{
			// User is the playlist owner, change the item's content
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
					return res.status(404).json({ errors: ["content not found"] });

				Item.update
				({
					contentId: content.contentId
				},
				{
					where: { itemId: req.params.itemId }
				});
				
				res.json( [] );
			});
		});
	}

	// Find content by the itemId, and link it to the track with specified trackId
	ContentController.linkContent = function(itemId, track, previousTrackId, tr, req, res, done)
	{
		return Content.findOne
		({
			attributes: ["contentId", "trackId"],
			include:
			[{
				model: Item,
				where: { itemId: itemId },
			}],
			transaction: tr,
		})
		.then(function(content)
		{
			// Content is not linked with the previous track
			if(content.trackId != previousTrackId)
				return done(track);

			// Already linked, no action required
			if(content.trackId == track.trackId)
				return done(track);

			// Update trackId of the content
			return content.update
			({
				trackId: track.trackId,
			},
			{ transaction: tr })
			.then(function()
			{
				// Remove the previously linked track if it has no references
				TrackController = core.controllers.Track;

				return TrackController.removeUnusedTrack(previousTrackId, tr,
				function onComplete()
				{
					return ContentLink.create
					({
						trackId: track.trackId,
						userId: req.user.userId,
						contentId: content.contentId
					},
					{ transaction: tr })
					.then(function()
					{
						return done(track);
					});
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
		if(!ContentController.REGEX.YOUTUBE.test(externalId) &&
			!ContentController.REGEX.SOUNDCLOUD.test(externalId))
			return false;

		return true;
	}

	ContentController.init = function()
	{
		app.get("/tracks/:trackId(\\d+)/content",
			ContentController.getTrackContent);

		app.put("/items/:itemId(\\d+)/content",
			paperwork.accept
			({
				sourceId: paperwork.all(Number, ContentController.validateSourceId),
				externalId: paperwork.all(String, ContentController.validateExternalId),
			}),
			ContentController.setItemContent);
	}

	return ContentController;
}
