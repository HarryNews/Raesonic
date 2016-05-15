module.exports = function(core)
{
	var HistoryController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;

	var User = sequelize.models.User;
	var Track = sequelize.models.Track;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Retrieve all track name changes
	HistoryController.getTrackEdits = function(req, res)
	{
		TrackEdit.all
		({
			attributes: ["editId", "artist", "title", "date"],
			limit: 20,
			where: { trackId: req.params.trackId },
			order: "editId DESC",
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
		ContentLink.all
		({
			attributes: ["linkId", "date"],
			limit: 20,
			where: { contentId: req.params.contentId },
			order: "linkId DESC",
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
	}

	HistoryController.init = function()
	{
		app.get("/tracks/:trackId(\\d+)/edits",
			HistoryController.getTrackEdits);

		app.get("/content/:contentId(\\d+)/links",
			HistoryController.getContentLinks);
	}

	return HistoryController;
}
