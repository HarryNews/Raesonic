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
				// Link content with the track
				content.update
				({
					trackId: track.trackId,
				})
				.then(function()
				{
					ContentLink.create
					({
						trackId: track.trackId,
						userId: req.user.userId,
						contentId: content.contentId,
					})
					.then(function()
					{
						// Don't log the edit, if the track existed before
						if(!created)
							return res.json(track.trackId);

						TrackEdit.create
						({
							artist: req.body.artist,
							title: req.body.title,
							userId: req.user.userId,
							trackId: track.trackId,
						})
						.then(function()
						{
							res.json(track.trackId);
						})
					});
				});
			});
		});
	}

	// Attempt to edit track information of the item's content without ruining anything
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
			where: { trackId: req.params.trackId }
		})
		.then(function(amount)
		{
			// Track isn't linked with anything, editing it shouldn't be possible at all
			if(!amount)
				return res.status(500).json({ errors: ["internal error"] });

			var changes = {};

			// If the track belongs to a single content, it is updated, otherwise a new track is
			// created and linked. That should prevent erroneous track changes, when the
			// content is linked to mismatching tracks
			if(amount == 1)
			{
				if(artist.changed)
					changes.artist = artist.name;

				if(title.changed)
					changes.title = title.name;

				// Check if a track with that name already exists
				Track.findOne
				({
					where:
					{
						artist: artist.name,
						title: title.name,
					}
				})
				.then(function(track)
				{
					// Track already exists, link the content with it
					if(track)
					{
						var ContentController = core.controllers.Content;
						ContentController.linkContent(req.body.itemId, track.trackId,
							req, res);

						return;
					}

					// Name is available, rename the existing track
					Track.update(changes,
					{
						where: { trackId: req.params.trackId },
					})
					.then(function()
					{
						changes.userId = req.user.userId;
						changes.trackId = req.params.trackId;

						TrackEdit
						.create(changes)
						.then(function()
						{
							res.json(req.params.trackId);
						});
					});
				});

				return;
			}

			// There are more than one content linked to this track, so we link the
			// existing track with that name, or create a new one if it doesn't exist

			changes.artist = artist.name;
			changes.title = title.name;

			Track.findOrCreate
			({
				where: changes,
			})
			.spread(function(track, created)
			{
				var ContentController = core.controllers.Content;
				ContentController.linkContent(req.body.itemId, track.trackId,
					req, res);

				// Add no track edits if no tracks were created
				if(!created)
					return;

				changes.userId = req.user.userId;
				changes.trackId = track.trackId;
				TrackEdit.create(changes);
			});
		});
	}

	// Delete a track if it has no references
	TrackController.removeUnusedTrack = function(trackId)
	{
		Relation.count
		({
			where:
			{
				$or:
				[
					{ trackId: trackId },
					{ linkedId: trackId },
				]
			}
		})
		.then(function(relationCount)
		{
			// Track has relations, keep it
			if(relationCount > 0)
				return;

			// Count content linked with the track
			Content.count
			({
				where: { trackId: trackId },
			})
			.then(function(contentCount)
			{
				// Track is linked to a content, keep it
				if(contentCount > 0)
					return;

				var params = { where: { trackId: trackId } };

				TrackEdit
				.destroy(params)
				.then(function()
				{
					ContentLink
					.destroy(params)
					.then(function()
					{
						Track.destroy(params);
					});
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
