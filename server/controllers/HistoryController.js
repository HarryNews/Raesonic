module.exports = function(core)
{
	var HistoryController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

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
		var include =
		[{
			model: User,
			attributes: ["userId", "username"],
		}];

		if(req.user)
		{
			var FlagController = core.controllers.Flag;

			include.push
			({
				model: TrackEditFlag,
				attributes: ["flagId", "resolved", "userId"],
				where:
				{
					userId: req.user.userId,
					resolved: FlagController.FLAG_STATE.UNRESOLVED,
				},
				required: false,
			});
		}

		TrackEdit.all
		({
			attributes: ["editId", "artist", "title", "date", "userId"],
			limit: 20,
			where: { trackId: req.params.trackId },
			order: [ ["editId", "ASC"] ],
			include: include,
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
					(trackEdits[index].TrackEditFlags != null)
						&& (trackEdits[index].TrackEditFlags[0] != null),
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

			var include =
			[{
				model: Track,
				attributes: ["artist", "title"],
			},
			{
				model: User,
				attributes: ["username"],
			}];

			if(req.user)
			{
				var FlagController = core.controllers.Flag;

				include.push
				({
					model: ContentLinkFlag,
					attributes: ["flagId", "resolved", "userId"],
					where:
					{
						userId: req.user.userId,
						resolved: FlagController.FLAG_STATE.UNRESOLVED,
					},
					required: false,
				});
			}
		
			ContentLink.all
			({
				attributes: ["linkId", "date", "trackId", "userId"],
				limit: 20,
				where: { contentId: content.contentId },
				order: [ ["linkId", "ASC"] ],
				include: include,
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
						(contentLinks[index].ContentLinkFlags != null)
							&& (contentLinks[index].ContentLinkFlags[0] != null),
					]);
				}
				
				res.json(response);
			});
		});
	}

	// Obtain a certain track edit of the track
	HistoryController.getTrackEditFromFields = function(editId, trackId, done)
	{
		TrackEdit.findOne
		({
			where:
			{
				editId: editId,
				trackId: trackId,
			},
		})
		.then(function(trackEdit)
		{
			done(trackEdit, "editId", editId);
		});
	}

	// Obtain a certain track edit of the track
	HistoryController.getContentLinkFromFields = function(linkId, sourceId, externalId, done)
	{
		ContentLink.findOne
		({
			where: { linkId: linkId },
			include:
			[{
				model: Content,
				attributes: ["contentId"],
				where:
				{
					sourceId: sourceId,
					externalId: externalId,
				},
			}],
		})
		.then(function(contentLink)
		{
			done(contentLink, "linkId", linkId);
		});
	}

	HistoryController.init = function()
	{
		app.get("/tracks/:trackId(\\d+)/edits",
			HistoryController.getTrackEdits);

		app.get("/content/:sourceId(\\d+)/:externalId/links",
			HistoryController.getContentLinks);
	}

	return HistoryController;
}
