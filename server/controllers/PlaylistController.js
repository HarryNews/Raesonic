module.exports = function(core)
{
	var Gravatar = require("gravatar");
	var RandomString = require("randomstring");

	var PlaylistController =
	{
		SECTION:
		{
			PRIVATE: 1,
			SHARED: 2,
			PUBLIC: 3,
			FAVORITES: 4,
			RECENT: 5,
		},
		ACCESS:
		{
			PRIVATE: 1,
			SHARED: 2,
			PUBLIC: 3,
		},
		DEFAULT_ALIAS_LENGTH: 12,
		NAME_REGEX: /^[a-z0-9?!@#$%^&*();:_+\-= \[\]{}/|\\"<>'.,]+$/i,
		// Access methods
		BY_PLAYLISTID: 1,
		BY_ITEMID: 2,
		BY_ALIAS: 3,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var config = core.config;

	var User = sequelize.models.User;
	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Playlist = sequelize.models.Playlist;
	var Item = sequelize.models.Item;
	var FavoritePlaylist = sequelize.models.FavoritePlaylist;

	var isVerificationRequired = config.auth.verification;

	// Create a new playlist with the specified name
	// Note: Main playlists are not created with this method
	PlaylistController.createPlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var ReputationController = core.controllers.Reputation;

		if( req.body.access == PlaylistController.ACCESS.PUBLIC &&
			!ReputationController.hasPermission(req.user,
				ReputationController.PERMISSION.OWN_PUBLIC_PLAYLISTS) )
					return res.status(403).json
						({ errors: ["not enough reputation"] });

		Playlist.create
		({
			name: req.body.name,
			userId: req.user.userId,
			access: req.body.access,
			alias: RandomString.generate(PlaylistController.DEFAULT_ALIAS_LENGTH),
		})
		.then(function(playlist)
		{
			res.json
			([
				playlist.playlistId,
				playlist.alias,
			]);
		});
	}

	// Retrieve playlist info and items
	PlaylistController.getPlaylist = function(req, res)
	{
		var condition = req.params.alias.match(/[^$\d]/)
			? { alias: req.params.alias }
			: { playlistId: req.params.alias };

		PlaylistController.verifyAccess(req.user, condition, res,
		function onConfirm()
		{
			var include =
			[{
				model: User,
				attributes: ["userId", "username", "email", "emailToken"],
			},
			{
				model: Item,
				attributes: ["itemId", "playlistPosition"],
				include:
				[{
					model: Content,
					attributes: ["sourceId", "externalId"],
					include:
					[{
						model: Track,
						attributes: ["trackId", "artist", "title"]
					}]
				}]
			}];

			if(req.user)
			{
				include.push
				({
					model: FavoritePlaylist,
					attributes: ["playlistId", "userId"],
					where: { userId: req.user.userId },
					required: false,
				});
			}

			Playlist.findOne
			({
				attributes: ["playlistId", "name", "access", "alias", "userId"],
				where: condition,
				order: [ [Item, "itemId", "DESC"] ],
				include: include,
			})
			.then(function(playlist)
			{
				var playlistData =
				[
					playlist.playlistId,
					playlist.name,
					playlist.access,
					playlist.alias,
				];

				// Include playlist creator data unless it's the same user
				if(!req.user || req.user.userId != playlist.User.userId)
				{
					var playlistOwner = playlist.User;

					var hasVerifiedEmail = ( !!playlistOwner.email &&
						( !isVerificationRequired ||
							!playlistOwner.emailToken )
					);

					var userData =
					[
						playlistOwner.username,
						Gravatar.url(
							hasVerifiedEmail
								? playlistOwner.email
								: playlistOwner.username,
							{ s: "13", r: "pg", d: "retro" }
						),
					];

					var isFavorited = (playlist.FavoritePlaylists != null)
						&& (playlist.FavoritePlaylists[0] != null);

					playlistData.push(userData, isFavorited);
				}

				var items = playlist.Items;
				var responseItems = [];

				for(var index in items)
				{
					responseItems.push
					([
						items[index].Content.Track.trackId,
						items[index].Content.Track.artist,
						items[index].Content.Track.title,
						items[index].itemId,
						items[index].Content.sourceId,
						items[index].Content.externalId,
						items[index].playlistPosition
					]);
				}

				var response =
				[
					playlistData,
					responseItems,
				];

				res.json(response);
			});
		});
	}

	// Retrieve main playlist of the user
	PlaylistController.getMainPlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.findOne
		({
			where: { userId: req.user.userId },
			order: [ ["playlistId", "ASC"] ],
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			req.params.alias = playlist.playlistId.toString();
			PlaylistController.getPlaylist(req, res);
		});
	}

	// Retrieve a list of own private playlists
	PlaylistController.getPrivateSection = function(req, res)
	{
		req.params.access = PlaylistController.SECTION.PRIVATE;
		return PlaylistController.getSection(req, res);
	}

	// Retrieve a list of own shared playlists
	PlaylistController.getSharedSection = function(req, res)
	{
		req.params.access = PlaylistController.SECTION.SHARED;
		return PlaylistController.getSection(req, res);
	}

	// Retrieve a list of own shared playlists
	PlaylistController.getPublicSection = function(req, res)
	{
		req.params.access = PlaylistController.SECTION.PUBLIC;
		return PlaylistController.getSection(req, res);
	}

	// Retrieve a list of favorite playlists
	PlaylistController.getFavoritesSection = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.all
		({
			attributes: ["playlistId", "name", "access", "alias", "count", "userId"],
			order: [ [FavoritePlaylist, "favoriteId", "ASC"] ],
			where:
			{
				access:
				{
					$ne: PlaylistController.ACCESS.PRIVATE,
				},
			},
			include:
			[{
				model: FavoritePlaylist,
				where: { userId: req.user.userId },
			}]
		})
		.then(function(playlists)
		{
			if(!playlists)
				return res.json( [] );

			var response = [];

			for(var index in playlists)
			{
				response.push
				([
					playlists[index].playlistId,
					playlists[index].name,
					playlists[index].access,
					playlists[index].alias,
					playlists[index].count,
				]);
			}

			res.json(response);
		});
	}

	// Retrieve a list of own playlists from the section
	PlaylistController.getSection = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.all
		({
			attributes: ["playlistId", "name", "access", "alias", "count", "userId"],
			where:
			{
				userId: req.user.userId,
				access: req.params.access,
			},
			order: [ ["playlistId", "ASC"] ],
		})
		.then(function(playlists)
		{
			if(!playlists)
				return res.json( [] );

			var response = [];

			for(var index in playlists)
			{
				response.push
				([
					playlists[index].playlistId,
					playlists[index].name,
					playlists[index].access,
					playlists[index].alias,
					playlists[index].count,
				]);
			}

			res.json(response);
		});
	}

	// Add a playlist to personal favorites
	PlaylistController.addFavoritePlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.findOne
		({
			attributes: ["playlistId", "userId"],
			where: { playlistId: req.body.playlistId },
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			if(playlist.userId == req.user.userId)
				return res.status(403).json({ errors: ["cannot favorite own playlist"] });

			FavoritePlaylist.findOrCreate
			({
				where:
				{
					playlistId: playlist.playlistId,
					userId: req.user.userId,
				},
			})
			.spread(function(favorite, created)
			{
				res.json( [] );
			});
		});
	}

	// Remove a playlist from the personal favorites
	PlaylistController.removeFavoritePlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		FavoritePlaylist.destroy
		({
			where:
			{
				playlistId: req.params.playlistId,
				userId: req.user.userId,
			},
		})
		.then(function(amount)
		{
			if(amount < 1)
				return res.status(500).json({ errors: ["internal error"] });

			res.json( [] );
		});
	}

	// Edit the name and access of the playlist
	PlaylistController.editPlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var ReputationController = core.controllers.Reputation;

		if( req.body.access == PlaylistController.ACCESS.PUBLIC &&
			!ReputationController.hasPermission(req.user,
				ReputationController.PERMISSION.OWN_PUBLIC_PLAYLISTS) )
					return res.status(403).json
						({ errors: ["not enough reputation"] });

		PlaylistController.verifyOwnership(req.user,
			PlaylistController.BY_PLAYLISTID, req.params.playlistId, res,
		function onConfirm(playlist)
		{
			// User is the playlist owner, update the playlist
			playlist.update
			({
				name: req.body.name,
				access: req.body.access,
			})
			.then(function()
			{
				res.json( [] );
			});
		});
	}

	// Delete the playlist
	PlaylistController.deletePlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		PlaylistController.verifyOwnership(req.user,
			PlaylistController.BY_PLAYLISTID, req.params.playlistId, res,
		function onConfirm(playlist)
		{
			// User is the playlist owner, delete the playlist
			playlist
			.destroy()
			.then(function()
			{
				res.json( [] );
			});
		});
	}

	// Add content as a new playlist item
	PlaylistController.addItem = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		PlaylistController.verifyOwnership(req.user,
			PlaylistController.BY_PLAYLISTID, req.params.playlistId, res,
		function onConfirm(playlist)
		{
			// User is the playlist owner, proceed to adding the item
			// Content is obtained and created if it doesn't exist
			Content.findOrCreate
			({
				where:
				{
					sourceId: req.body.sourceId,
					externalId: req.body.externalId
				},
				defaults: { trackId: -1 },
				include:
				[{
					model: Track,
					attributes: ["trackId", "artist", "title"]
				}]
			})
			.spread(function(content, created)
			{
				sequelize.transaction(function(tr)
				{
					// Create new item linked with the obtained content
					return Item.create
					({
						playlistId: req.params.playlistId,
						contentId: content.contentId,
						playlistPosition: playlist.count
					},
					{ transaction: tr })
					.then(function(item)
					{
						return playlist
						.increment("count",
						{ transaction: tr })
						.then(function()
						{
							var TrackController = core.controllers.Track;

							var track = created
								? TrackController.UNKNOWN_TRACK
								: content.Track;

							var response =
							[
								track.trackId,
								track.artist,
								track.title,
								item.itemId,
								item.playlistPosition,
							];

							return response;
						})
					});
				})
				.then(function(response)
				{
					res.json(response);
				})
				.catch(function(err)
				{
					return res.status(500).json({ errors: ["internal error"] });
				});
			});
		});
	}

	// Creates a main playlist for the newly created account
	PlaylistController.createMainPlaylist = function(user, tr)
	{
		return Playlist.create
		({
			name: "Main",
			userId: user.userId,
			alias: RandomString.generate(PlaylistController.DEFAULT_ALIAS_LENGTH),
		},
		{ transaction: tr })
		.then(function()
		{
			return user;
		});
	}

	// Calls confirm if the user is a playlist owner
	PlaylistController.verifyOwnership = function(user, method, entityId, res, confirm)
	{
		var params = {};

		switch(method)
		{
			case PlaylistController.BY_PLAYLISTID:
			{
				params =
				{
					attributes: ["playlistId", "userId", "count"],
					where: { playlistId: entityId }
				};
				break;
			}
			case PlaylistController.BY_ITEMID:
			{
				params =
				{
					attributes: ["playlistId", "userId", "count"],
					include:
					[{
						model: Item,
						where: { itemId: entityId }
					}]
				};
				break;
			}
			default:
			{
				return res.status(500).json({ errors: ["internal error"] });
			}
		}

		Playlist
		.findOne(params)
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			if(user.userId != playlist.userId)
				return res.status(403).json({ errors: ["no access"] });

			confirm(playlist);
		});
	}

	// Calls confirm if the user can view playlist
	PlaylistController.verifyAccess = function(user, condition, res, confirm)
	{
		Playlist.findOne
		({
			attributes: ["userId", "access"],
			where: condition,
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			// Playlist owners always have access
			if(user && user.userId == playlist.userId)
				return confirm();

			// Shared playlists can only be reached by their alias
			if(!condition.alias &&
				playlist.access == PlaylistController.ACCESS.SHARED)
				return res.status(403).json({ errors: ["no access"] });

			// Playlist owners don't reach this line, deny access
			if(playlist.access == PlaylistController.ACCESS.PRIVATE)
				return res.status(403).json({ errors: ["no access"] });

			confirm();
		});
	}

	// Returns true if the id is in valid range
	PlaylistController.validateId = function(id)
	{
		return (id > 0);
	}

	// Returns true if the playlist name is valid
	PlaylistController.validateName = function(name)
	{
		if(name.length < 3 || name.length > 50)
			return false;

		if(!PlaylistController.NAME_REGEX.test(name))
			return false;

		return true;
	}

	// Returns true if the playlist access is valid
	PlaylistController.validateAccess = function(access)
	{
		return ( access == PlaylistController.ACCESS.PRIVATE ||
			access == PlaylistController.ACCESS.SHARED ||
			access == PlaylistController.ACCESS.PUBLIC );
	}
	
	PlaylistController.init = function()
	{
		var ContentController = core.controllers.Content;

		app.post("/playlists",
			paperwork.accept
			({
				name: paperwork.all(String, PlaylistController.validateName),
				access: paperwork.all(Number, PlaylistController.validateAccess),
			}),
			PlaylistController.createPlaylist);

		var FlagController = core.controllers.Flag;

		app.get("/playlists/track-name-flags",
			FlagController.getTrackEditPlaylist);

		app.get("/playlists/content-association-flags",
			FlagController.getContentLinkPlaylist);

		app.get("/playlists/:alias",
			PlaylistController.getPlaylist);

		app.get("/own/playlists/main",
			PlaylistController.getMainPlaylist);

		app.get("/own/playlists/private",
			PlaylistController.getPrivateSection);

		app.get("/own/playlists/shared",
			PlaylistController.getSharedSection);

		app.get("/own/playlists/public",
			PlaylistController.getPublicSection);

		app.get("/own/playlists/favorites",
			PlaylistController.getFavoritesSection);

		app.post("/own/playlists/favorites",
			paperwork.accept
			({
				playlistId: paperwork.all(Number, PlaylistController.validateId),
			}),
			PlaylistController.addFavoritePlaylist);

		app.delete("/own/playlists/favorites/:playlistId(\\d+)",
			PlaylistController.removeFavoritePlaylist);

		app.put("/playlists/:playlistId(\\d+)",
			paperwork.accept
			({
				name: paperwork.all(String, PlaylistController.validateName),
				access: paperwork.all(Number, PlaylistController.validateAccess),
			}),
			PlaylistController.editPlaylist);
		
		app.delete("/playlists/:playlistId(\\d+)",
			PlaylistController.deletePlaylist);
		
		app.post("/playlists/:playlistId(\\d+)",
			paperwork.accept
			({
				sourceId: paperwork.all(Number, ContentController.validateSourceId),
				externalId: paperwork.all(String, ContentController.validateExternalId),
			}),
			PlaylistController.addItem);
	}

	return PlaylistController;
}
