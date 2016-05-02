module.exports = function(core)
{
	var TrackController = {};

	var ContentController = require("./ContentController.js")(core);

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Item = sequelize.models.Item;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Assign an existing track with specified name to the item's content, or create a new one
	TrackController.createTrack = function(req, res)
	{
		// todo: return error if not logged in
		// todo: return error if artist/title contain restricted characters

		Track.findOrCreate
		({
			where:
			{
				artist: req.body.artist,
				title: req.body.title
			}
		})
		.spread(function(track, created)
		{
			// Item is not linked directly with the track, so we get the item's content first
			Content.findOne
			({
				attributes: ["contentId"],
				include:
				[{
					model: Item,
					where: { itemId: req.body.itemId }
				}]
			})
			.then(function(content)
			{
				// Link content with the track we've found/created
				Content.update
				({
					trackId: track.trackId
				},
				{
					where: { contentId: content.contentId }
				});

				res.json(track.trackId);

				// todo: use actual user id
				ContentLink.create
				({
					trackId: track.trackId,
					userId: 1,
					contentId: content.contentId
				});
			});

			// Add no track edits if no tracks were created
			if(!created)
				return;

			// todo: use actual user id
			TrackEdit.create
			({
				artist: req.body.artist,
				title: req.body.title,
				userId: 1,
				trackId: track.trackId
			})
		});
	}

	// Attempt to edit track information of the item's content without ruining anything
	TrackController.editTrack = function(req, res)
	{
		var artist = req.body.artist;
		var title = req.body.title;

		// Nothing to change, bail out
		if(!artist.changed && !title.changed)
			return res.status(400).json({ errors: ["no changes"] });

		// todo: return error if not logged in
		// todo: return error if not enough trust to submit edits

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
						title: title.name
					}
				})
				.then(function(track)
				{
					// Track already exists, link content with it
					if(track)
						return ContentController.linkContent(req.body.itemId, track.trackId, res);

					// Found no track with that name, we can take it now
					Track.update(changes,
					{
						where: { trackId: req.params.trackId }
					})
					.then(function()
					{
						res.json(req.params.trackId);
					});

					// todo: use actual user id
					changes.userId = 1;
					changes.trackId = req.params.trackId;
					TrackEdit.create(changes);

					return;
				});

				return;
			}

			// There are more than one content linked to this track, so we link the
			// existing track with that name, or create a new one if it doesn't exist

			changes.artist = artist.name;
			changes.title = title.name;

			Track.findOrCreate
			({
				where: changes
			})
			.spread(function(track, created)
			{
				ContentController.linkContent(req.body.itemId, track.trackId, res);

				// Add no track edits if no tracks were created
				if(!created)
					return;

				// todo: use actual user id
				changes.userId = 1;
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
					{ linkedId: trackId }
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
				where: { trackId: trackId }
			})
			.then(function(contentCount)
			{
				// Track is linked to a content, keep it
				if(contentCount > 0)
					return;

				var params = { where: { trackId: trackId } };

				TrackEdit.destroy(params);
				ContentLink.destroy(params);
				Track.destroy(params);
			});
		});
	}

	// Returns true if an id is in valid range
	TrackController.validateId = function(id)
	{
		return (id > 0);
	}

	// Returns true if track artist/title is valid
	TrackController.validateName = function(name)
	{
		if(name.length < 3 || name.length > 50)
			return false;

		// todo: restrict to a-zA-Z0-9!&()_+- (estimate)

		return true;
	}

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

	return TrackController;
}
