module.exports = function(core)
{
	var HistoryController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var User = sequelize.models.User;
	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

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

			include = FlagController.includeFlagState
				(include, TrackEdit, req.user);
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

				include = FlagController.includeFlagState
					(include, ContentLink, req.user);
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

	// Dismiss the specified track edit
	HistoryController.dismissTrackEdit = function(trackEdit, isMalicious, tr)
	{
		return Track.findOne
		({
			attributes: ["trackId", "artist", "title"],
			include:
			[{
				model: TrackEdit,
				where: { editId: trackEdit.editId },
			}],
			transaction: tr,
		})
		.then(function(track)
		{
			if(!track)
				return res.status(404).json({ errors: ["track not found"] });

			return TrackEdit.all
			({
				attributes: ["editId", "artist", "title", "trackId"],
				where: { trackId: track.trackId },
				order: [ ["editId", "DESC"] ],
				transaction: tr,
			})
			.then(function(trackEdits)
			{
				var ReputationController = core.controllers.Reputation;

				return trackEdit
				.getUser()
				.then(function(user)
				{
					if(!user)
						return res.status(404).json({ errors: ["user not found"] });

					var users = [ user ];

					var reputationChange =
						ReputationController.DISMISSAL_PENALTY.TRACK_EDIT;

					if(trackEdits.length < 2)
					{
						// The track edit is the only one that exists, remove all
						// track references, then remove the track itself
						var TrackController = core.controllers.Track;

						return TrackController
						.dismissTrack(track, isMalicious, tr)
						.then(function()
						{
							if(!isMalicious)
								return TrackController.UNKNOWN_TRACK;

							return ReputationController.bulkUpdateReputation
							(users, reputationChange, tr)
							.then(function()
							{
								return TrackController.UNKNOWN_TRACK;
							});
						});
					}

					var latestTrackEdit = trackEdits[0];

					if(trackEdit.editId == latestTrackEdit.editId)
					{
						// The track edit is the latest change, revert the track
						// name to the data from the previous changes
						var artist = null;
						var title = null;

						for(var index = 1; index < trackEdits.length; index++)
						{
							var historyArtist = trackEdits[index].artist;
							var historyTitle = trackEdits[index].title;

							artist = artist || historyArtist;
							title = title || historyTitle;

							if(artist != null && title != null)
								break;
						}

						if(artist == null || title == null)
							return res.status(404).json
								({ errors: ["rollback data not found"] });

						return track.update
						({
							artist: artist,
							title: title,
						},
						{ transaction: tr })
						.then(function()
						{
							return trackEdit
							.destroy({ transaction: tr })
							.then(function()
							{
								if(!isMalicious)
									return track;

								return ReputationController.bulkUpdateReputation
								(users, reputationChange, tr)
								.then(function()
								{
									return track;
								});
							});
						});
					}

					// Removing a change that's nor the last, nor the only one
					// Move its data to the missing fields of a newer change
					for(var index = trackEdits.length - 1; index >= 0; index--)
					{
						if( trackEdits[index].editId <= trackEdit.editId )
							continue;

						var artist = trackEdit.artist;
						var title = trackEdit.title;

						var newerArtist = trackEdits[index].artist;
						var newerTitle = trackEdits[index].title;

						var params =
						{
							artist: newerArtist || artist,
							title: newerTitle || title,
						};

						// Update the newer track edit
						return TrackEdit
						.update(params,
						{
							where: { editId: trackEdits[index].editId },
							transaction: tr,
						})
						.then(function()
						{
							// Remove dismissed track edit
							return trackEdit
							.destroy({ transaction: tr })
							.then(function()
							{
								if(!isMalicious)
									return track;

								return ReputationController.bulkUpdateReputation
								(users, reputationChange, tr)
								.then(function()
								{
									return track;
								});
							});
						});
					}

					return res.status(500).json({ errors: ["internal error"] });
				});
			});
		});
	}

	// Dismiss the specified content link
	HistoryController.dismissContentLink = function(contentLink, isMalicious, tr)
	{
		return Content.findOne
		({
			attributes: ["contentId", "trackId"],
			include:
			[{
				model: ContentLink,
				where: { linkId: contentLink.linkId },
			}],
			transaction: tr,
		})
		.then(function(content)
		{
			if(!content)
				return res.status(404).json({ errors: ["content not found"] });

			var trackId = contentLink.trackId;

			return ContentLink.all
			({
				attributes: ["linkId", "contentId", "trackId"],
				where: { contentId: content.contentId },
				order: [ ["linkId", "DESC"] ],
				transaction: tr,
			})
			.then(function(contentLinks)
			{
				var ReputationController = core.controllers.Reputation;
				var TrackController = core.controllers.Track;

				return contentLink
				.getUser()
				.then(function(user)
				{
					if(!user)
						return res.status(404).json({ errors: ["user not found"] });

					var users = [ user ];

					var reputationChange =
						ReputationController.DISMISSAL_PENALTY.CONTENT_LINK;

					if(contentLinks.length < 2)
					{
						// The association is the only existing one, unassign track
						// from the content, and remove the track unless it has references
						return content.update
						({
							trackId: -1,
						},
						{ transaction: tr })
						.then(function()
						{
							return contentLink
							.destroy
							({ transaction: tr })
							.then(function()
							{
								return TrackController.removeUnusedTrack
								(trackId, tr,
								function onDone()
								{
									if(!isMalicious)
										return TrackController.UNKNOWN_TRACK;

									return ReputationController.bulkUpdateReputation
									(users, reputationChange, tr)
									.then(function()
									{
										return TrackController.UNKNOWN_TRACK;
									});
								});
							});
						});
					}

					var latestContentLink = contentLinks[0];

					if(contentLink.linkId == latestContentLink.linkId)
					{
						// The subject is the most recent track association, revert to a
						// previously associated track, that differs from the current one
						var associatedTrackId = latestContentLink.trackId;
						var historyTrackId = null;

						for(var index = 1; index < contentLinks.length; index++)
						{
							historyTrackId = contentLinks[index].trackId;

							if(historyTrackId != associatedTrackId)
								break;
						}

						return content.update
						({
							trackId: historyTrackId,
						},
						{ transaction: tr })
						.then(function()
						{
							return contentLink
							.destroy
							({ transaction: tr })
							.then(function()
							{
								return TrackController.removeUnusedTrack
								(trackId, tr,
								function onDone()
								{
									if(!isMalicious)
										return content.getTrack({ transaction: tr });

									return ReputationController.bulkUpdateReputation
									(users, reputationChange, tr)
									.then(function()
									{
										return content.getTrack({ transaction: tr });
									});
								});
							});
						});
					}

					// Removing an association with the track that's not
					// currently in use, destroy it without altering the content
					return contentLink
					.destroy
					({ transaction: tr })
					.then(function()
					{
						if(!isMalicious)
							return content.getTrack({ transaction: tr });

						return ReputationController.bulkUpdateReputation
						(users, reputationChange, tr)
						.then(function()
						{
							return content.getTrack({ transaction: tr });
						});
					});
				});
			});
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
