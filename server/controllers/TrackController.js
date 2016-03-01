module.exports = function(app, sequelize)
{
	var ContentController = require("./ContentController.js");

	var TrackController = {};

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Item = sequelize.models.Item;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Assign an existing track with specified name to the item's content, or create a new one
	TrackController.createTrack = function(req, res)
	{
		if(!req.body || !req.body.itemId || !req.body.artist || !req.body.title ||
			req.body.artist.length > 50 || req.body.title.length > 50)
			return res.status(500).json({ error: true });

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
				// Link content with the track we found/created
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
		if(!req.body)
			return res.status(500).json({ error: true });

		var artist = req.body["artist[]"];
		var title = req.body["title[]"];

		if(!req.body.itemId || ((!artist || artist.length != 2) &&
			(!title || title.length != 2)) || artist[0].length > 50 || title[0].length > 50)
			return res.status(500).json({ error: true });

		artist = { text: artist[0], changed: artist[1] == "true" }
		title = { text: title[0], changed: title[1] == "true" }

		// No trust for the client-side huh
		if(!artist.changed && !title.changed)
			return;

		// todo: return error if not logged in
		// todo: return error if artist/title contain restricted characters
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
				return res.status(500).json({ error: true });

			var changes = {};

			// If the track belongs to a single content, it is updated, otherwise a new track is
			// created and linked. That should prevent erroneous track changes, when the
			// content is linked to mismatching tracks
			if(amount == 1)
			{
				if(artist.changed)
					changes.artist = artist.text;

				if(title.changed)
					changes.title = title.text;

				// Check if a track with that name already exists
				Track.findOne
				({
					where:
					{
						artist: artist.text,
						title: title.text
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

			changes.artist = artist.text;
			changes.title = title.text;

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

	app
		.route("/tracks/")
			.post(TrackController.createTrack);

	app
		.route("/tracks/:trackId(\\d+)")
			.put(TrackController.editTrack);

	return TrackController;
}
