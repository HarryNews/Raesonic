module.exports = function(core)
{
	var HistoryController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;

	var User = sequelize.models.User;
	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;
	var TrackEditFlag = sequelize.models.TrackEditFlag;
	var ContentLinkFlag = sequelize.models.ContentLinkFlag;

	// Retrieve all track name changes
	HistoryController.getTrackEdits = function(req, res)
	{
		TrackEdit.all
		({
			attributes: ["editId", "artist", "title", "date"],
			limit: 20,
			where: { trackId: req.params.trackId },
			order: "editId ASC",
			include:
			[{
				model: User,
				attributes: ["username"],
			}]
		})
		.then(function(trackEdits)
		{
			var response = [];

			for(var index in trackEdits)
			{
				response.push
				([
					trackEdits[index].editId,
					trackEdits[index].artist,
					trackEdits[index].title,
					trackEdits[index].date,
					trackEdits[index].User.username,
				]);
			}
			
			res.json(response);
		});
	}

	// Retrieve all links for the content specified
	HistoryController.getContentLinks = function(req, res)
	{
		Content.findOne
		({
			attributes: ["contentId"],
			where:
			{
				sourceId: req.params.sourceId,
				externalId: req.params.externalId
			}
		})
		.then(function(content)
		{
			// Content doesn't exist, nothing to retrieve data for
			if(!content)
				return res.status(404).json({ errors: ["content not found"] });
		
			ContentLink.all
			({
				attributes: ["linkId", "date"],
				limit: 20,
				where: { contentId: content.contentId },
				order: "linkId ASC",
				include:
				[{
					model: Track,
					attributes: ["artist", "title"],
				},
				{
					model: User,
					attributes: ["username"],
				}]
			})
			.then(function(contentLinks)
			{
				var response = [];

				for(var index in contentLinks)
				{
					response.push
					([
						contentLinks[index].linkId,
						contentLinks[index].Track.artist,
						contentLinks[index].Track.title,
						contentLinks[index].date,
						contentLinks[index].User.username,
					]);
				}
				
				res.json(response);
			});
		});
	}

	// Create a flag marking track edit as inappropriate
	HistoryController.createTrackEditFlag = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		TrackEdit.findOne
		({
			attributes: ["editId"],
			where:
			{
				editId: req.params.editId,
				trackId: req.params.trackId,
			},
		})
		.then(function(trackEdit)
		{
			// Track edit not found, nothing to flag
			if(!trackEdit)
				return res.status(404).json({ errors: ["track edit not found"] });

			TrackEditFlag.findOrCreate
			({
				defaults: { reasonId: req.body.reasonId },
				where:
				{
					editId: trackEdit.editId,
					userId: req.user.userId,
					resolved: 0,
				}
			})
			.spread(function(flag, created)
			{
				// No changes required, bail out
				if(created || flag.reasonId == req.body.reasonId)
					return;

				TrackEditFlag.update
				({
					reasonId: req.body.reasonId,
				},
				{
					where: { flagId: flag.flagId },
				});
			});
			
			res.json( [] );
		});
	}

	// Create a flag marking content link as inappropriate
	HistoryController.createContentLinkFlag = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		ContentLink.findOne
		({
			attributes: ["linkId"],
			where: { linkId: req.params.linkId },
			include:
			[{
				model: Content,
				attributes: ["contentId"],
				where:
				{
					sourceId: req.params.sourceId,
					externalId: req.params.externalId,
				},
			}],
		})
		.then(function(contentLink)
		{
			// Content link not found, nothing to flag
			if(!contentLink)
				return res.status(404).json({ errors: ["content link not found"] });

			ContentLinkFlag.findOrCreate
			({
				defaults: { reasonId: req.body.reasonId },
				where:
				{
					linkId: contentLink.linkId,
					userId: req.user.userId,
					resolved: 0,
				}
			})
			.spread(function(flag, created)
			{
				// No changes required, bail out
				if(created || flag.reasonId == req.body.reasonId)
					return;

				ContentLinkFlag.update
				({
					reasonId: req.body.reasonId,
				},
				{
					where: { flagId: flag.flagId },
				});
			});
			
			res.json( [] );
		});
	}

	// Returns true if the track edit reason id is valid
	HistoryController.validateTrackEditReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2);
	}

	// Returns true if the content link reason id is valid
	HistoryController.validateContentLinkReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2 || reasonId == 3);
	}

	HistoryController.init = function()
	{
		app.get("/tracks/:trackId(\\d+)/edits",
			HistoryController.getTrackEdits);

		app.post("/tracks/:trackId(\\d+)/edits/:editId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, HistoryController.validateTrackEditReasonId),
			}),
			HistoryController.createTrackEditFlag);

		app.get("/content/:sourceId(\\d+)/:externalId/links",
			HistoryController.getContentLinks);

		app.post("/content/:sourceId(\\d+)/:externalId/links/:linkId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, HistoryController.validateContentLinkReasonId),
			}),
			HistoryController.createContentLinkFlag);
	}

	return HistoryController;
}
