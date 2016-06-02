module.exports = function(core)
{
	var TrackController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Item = sequelize.models.Item;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Assign an existing track with specified name to the item's content, or create a new one
	TrackController.createTrack = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Track.findOrCreate
		({
			where:
			{
				artist: req.body.artist,
				title: req.body.title,
			}
		})
		.spread(function(track, created)
		{
			// Look up content of the item to link it with the track
			Content.findOne
			({
				attributes: ["contentId"],
				include:
				[{
					model: Item,
					where: { itemId: req.body.itemId },
				}],
			})
			.then(function(content)
			{
				sequelize.transaction(function(tr)
				{
					// Link content with the track
					return content.update
					({
						trackId: track.trackId,
					},
					{ transaction: tr })
					.then(function()
					{
						return ContentLink.create
						({
							trackId: track.trackId,
							userId: req.user.userId,
							contentId: content.contentId,
						},
						{ transaction: tr })
						.then(function()
						{
							// Don't log the edit, if the track existed before
							if(!created)
								return track;

							return TrackEdit.create
							({
								artist: req.body.artist,
								title: req.body.title,
								userId: req.user.userId,
								trackId: track.trackId,
							},
							{ transaction: tr })
							.then(function()
							{
								return track;
							})
						});
					});
				})
				.then(function(track)
				{
					res.json(track.trackId);
				})
				.catch(function(err)
				{
					return res.status(500).json({ errors: ["internal error"] });
				});
			});
		});
	}

	// Edit track information of the item's content
	// Tracks may be split and merged throughout the method
	TrackController.editTrack = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var artist = req.body.artist;
		var title = req.body.title;

		// Nothing to change, bail out
		if(!artist.changed && !title.changed)
			return res.status(400).json({ errors: ["no changes"] });

		// todo: implement code below
		// if(!ReputationController.hasPermission(req.user, ReputationController.EDIT_TRACK))
		// 	return res.status(403).json({ errors: ["not enough reputation"] });

		// Count amount of content the track is linked with
		Content.count
		({
			where: { trackId: req.params.trackId },
		})
		.then(function(amount)
		{
			// Track isn't linked with anything, editing it shouldn't be possible at all
			if(!amount)
				return res.status(500).json({ errors: ["internal error"] });

			var changes = {};

			sequelize.transaction(function(tr)
			{
				// If the track belongs to a single content, it is updated, otherwise
				// a new track is created and linked. That should prevent erroneous
				// track changes, when the content is linked to mismatching tracks
				if(amount == 1)
				{
					if(artist.changed)
						changes.artist = artist.name;

					if(title.changed)
						changes.title = title.name;

					// Check if a track with the new name already exists
					return Track.findOne
					({
						where:
						{
							artist: artist.name,
							title: title.name,
						},
						transaction: tr,
					})
					.then(function(conflictingTrack)
					{
						// Track already exists, link the content with it
						if(conflictingTrack)
						{
							var ContentController = core.controllers.Content;

							return ContentController.linkContent(req.body.itemId,
								conflictingTrack, tr, req, res,
							function onContentLink(track)
							{
								return track;
							});
						}

						// Name is available, rename the existing track
						return Track.update
						(changes,
						{
							where: { trackId: req.params.trackId },
							transaction: tr,
						})
						.then(function()
						{
							var track = { trackId: req.params.trackId };

							changes.userId = req.user.userId;
							changes.trackId = req.params.trackId;

							return TrackEdit.create
							(changes,
							{ transaction: tr })
							.then(function()
							{
								return track;
							});
						});
					});

					return;
				}

				// There's multiple content linked with the track, the item's
				// content is linked to a new/existing track with the new name

				// No track updates below this line so both fields are required
				changes = 
				{
					artist: artist.name,
					title: title.name,
				};

				return Track.findOrCreate
				({
					where: changes,
					transaction: tr,
				})
				.spread(function(track, created)
				{
					var ContentController = core.controllers.Content;

					return ContentController.linkContent(req.body.itemId, track,
						tr, req, res,
					function onContentLink(track)
					{
						// Add no track edits if no tracks were created
						if(!created)
							return track;

						changes.userId = req.user.userId;
						changes.trackId = track.trackId;

						return TrackEdit
						.create(changes,
						{ transaction: tr })
						.then(function()
						{
							return track;
						});
					});
				});
			})
			.then(function(track)
			{
				res.json(track.trackId);
			})
			.catch(function(err)
			{
				return res.status(500).json({ errors: ["internal error"] });
			});
		});
	}

	// Delete a track if it has no references
	TrackController.removeUnusedTrack = function(trackId, tr, done)
	{
		return Relation.count
		({
			where:
			{
				$or:
				[
					{ trackId: trackId },
					{ linkedId: trackId },
				],
			},
			transaction: tr,
		})
		.then(function(relationCount)
		{
			// Track has relations, keep it
			if(relationCount > 0)
				return done();

			// Count content linked with the track
			return Content.count
			({
				where: { trackId: trackId },
				transaction: tr,
			})
			.then(function(contentCount)
			{
				// Track is linked with content, keep it
				if(contentCount > 0)
					return done();

				// Remove the track and all associated rows
				return Track.destroy
				({
					where: { trackId: trackId },
					transaction: tr,
				})
				.then(function()
				{
					return done();
				});
			});
		});
	}

	// Returns true if the id is in valid range
	TrackController.validateId = function(id)
	{
		return (id > 0);
	}

	// Returns true if the track artist or title is valid
	TrackController.validateName = function(name)
	{
		if(name.length < 3 || name.length > 50)
			return false;

		// todo: restrict to a-zA-Z0-9!&()_+- (estimate)

		return true;
	}

	TrackController.init = function()
	{
		app.post("/tracks",
			paperwork.accept
			({
				itemId: paperwork.all(Number, TrackController.validateId),
				artist: paperwork.all(String, TrackController.validateName),
				title: paperwork.all(String, TrackController.validateName),
			}),
			TrackController.createTrack);

		app.put("/tracks/:trackId(\\d+)",
			paperwork.accept
			({
				itemId: paperwork.all(Number, TrackController.validateId),
				artist:
				{
					name: paperwork.all(String, TrackController.validateName),
					changed: Boolean,
				},
				title:
				{
					name: paperwork.all(String, TrackController.validateName),
					changed: Boolean,
				},
			}),
			TrackController.editTrack);
	}

	return TrackController;
}
