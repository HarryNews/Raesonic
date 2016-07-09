module.exports = function(core)
{
	var FlagController =
	{
		ENTITY:
		{
			USER: 1,
			PLAYLIST: 2,
			RELATION: 3,
			TRACK_EDIT: 4,
			CONTENT_LINK: 5,
		},
		ACTION:
		{
			CREATE: 1,
			COUNT: 2,
		},
		FLAG_STATE:
		{
			RESOLVED_MALICIOUS: -2,
			RESOLVED: -1,
			UNRESOLVED: 0,
			RESOLVED_HELPFUL: 1,
		},
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var User = sequelize.models.User;
	var Content = sequelize.models.Content;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;
	var RelationFlag = sequelize.models.RelationFlag;
	var TrackEditFlag = sequelize.models.TrackEditFlag;
	var ContentLinkFlag = sequelize.models.ContentLinkFlag;

	// Route the flag request based on entity and action
	FlagController.routeRequest = function(actionType, entityType, req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		if( !FlagController.canPerformAction(actionType, req, res) )
			return;

		FlagController.performAction(actionType, entityType, req, res);
	}

	// Return true if the user can perform an action
	FlagController.canPerformAction = function(actionType, req, res)
	{
		var ReputationController = core.controllers.Reputation;

		switch(actionType)
		{
			case FlagController.ACTION.CREATE:
			{
				if( !ReputationController.hasPermission(req.user,
					ReputationController.PERMISSION.SUBMIT_FLAGS) )
				{
						res.status(403).json
							({ errors: ["not enough reputation"] });

						return false;
				}

				if( !ReputationController.canPerformActivity(req.user,
					ReputationController.ACTIVITY.SUBMIT_FLAGS) )
				{
						res.status(403).json
							({ errors: ["exceeded daily activity limit"] });

						return false;
				}

				return true;
			}
			case FlagController.ACTION.COUNT:
			{
				if( !ReputationController.hasPermission(req.user,
					ReputationController.PERMISSION.VIEW_FLAG_COUNT) )
				{
						res.status(403).json
							({ errors: ["not enough reputation"] });

						return false;
				}

				return true;
			}
			default:
			{
				res.status(500).json({ errors: ["internal error"] });

				return true;
			}
		}
	}

	// Obtain an entity and perform an action with it
	FlagController.performAction = function(actionType, entityType, req, res)
	{
		switch(entityType)
		{
			case FlagController.ENTITY.RELATION:
			{
				var RelationController = core.controllers.Relation;

				RelationController.getRelationFromTracks(
					req.params.trackId, req.params.linkedId,
				function onEntityResolve(entity, entityField, entityId)
				{
					FlagController.performActionWith
						(entity, entityField, entityId, actionType, req, res);
				});

				break;
			}
			case FlagController.ENTITY.TRACK_EDIT:
			{
				var HistoryController = core.controllers.History;

				HistoryController.getTrackEditFromFields(
					req.params.editId, req.params.trackId,
				function onEntityResolve(entity, entityField, entityId)
				{
					FlagController.performActionWith
						(entity, entityField, entityId, actionType, req, res);
				});

				break;
			}
			case FlagController.ENTITY.CONTENT_LINK:
			{
				var HistoryController = core.controllers.History;

				HistoryController.getContentLinkFromFields(
					req.params.linkId,
					req.params.sourceId, req.params.externalId,
				function onEntityResolve(entity, entityField, entityId)
				{
					FlagController.performActionWith
						(entity, entityField, entityId, actionType, req, res);
				});

				break;
			}
			default:
			{
				return res.status(500).json({ errors: ["internal error"] });
			}
		}
	}

	// Perform an action with the entity
	FlagController.performActionWith = function(entity, entityField, entityId, actionType, req, res)
	{
		// Entity doesn't exist, nothing to perform action on
		if(!entity)
			return res.status(404).json({ errors: ["entity not found"] });

		switch(actionType)
		{
			case FlagController.ACTION.CREATE:
			{
				FlagController.setFlag
					(entity, entityField, entityId, req, res);

				break;
			}
			case FlagController.ACTION.COUNT:
			{
				FlagController.getFlagCount
					(entity, entityField, entityId, req, res);

				break;
			}
			default:
			{
				return res.status(500).json({ errors: ["internal error"] });
			}
		}
	}

	// Return flag model for the given entity model
	FlagController.getFlagModel = function(model)
	{
		switch(model)
		{
			case Relation: { return RelationFlag; }
			case TrackEdit: { return TrackEditFlag; }
			case ContentLink: { return ContentLinkFlag; }
			default: { return null; }
		}
	}

	// Update or create a flag for the specified entity
	FlagController.setFlag = function(entity, entityField, entityId, req, res)
	{
		var model =
			FlagController.getFlagModel(entity.Model);

		if(model == null)
			return res.status(500).json({ errors: ["internal error"] });

		var params =
		{
			userId: req.user.userId,
			resolved: FlagController.FLAG_STATE.UNRESOLVED,
		};

		params[entityField] = entityId;

		sequelize.transaction(function(tr)
		{
			return model.findOrCreate
			({
				defaults: { reasonId: req.body.reasonId },
				where: params,
				transaction: tr,
			})
			.spread(function(flag, created)
			{
				var ReputationController = core.controllers.Reputation;

				// No changes required, bail out
				if(created || flag.reasonId == req.body.reasonId)
				{
					return ReputationController.addActivity(req.user,
						ReputationController.ACTIVITY.SUBMIT_FLAGS,
						tr,
					function onDone()
					{
						return;
					});
				}

				return flag.update
				({
					reasonId: req.body.reasonId,
				},
				{ transaction: tr })
				.then(function()
				{
					return ReputationController.addActivity(req.user,
						ReputationController.ACTIVITY.SUBMIT_FLAGS,
						tr,
					function onDone()
					{
						return;
					});
				});
			});
		})
		.then(function()
		{
			res.json( [] );
		})
		.catch(function(err)
		{
			return res.status(500).json({ errors: ["internal error"] });
		});
	}

	// Return flag count on each reason for the specified entity
	FlagController.getFlagCount = function(entity, entityField, entityId, req, res)
	{
		var model =
			FlagController.getFlagModel(entity.Model);

		if(model == null)
			return res.status(500).json({ errors: ["internal error"] });

		var params =
		{
			resolved: FlagController.FLAG_STATE.UNRESOLVED,
		};

		params[entityField] = entityId;

		return model.all
		({
			attributes:
			[
				"reasonId",
				[
					sequelize.fn( "COUNT", sequelize.col(entityField) ),
					"flags",
				],
			],
			where: params,
			group: ["reasonId"],
		})
		.then(function(counts)
		{
			var response = {};

			counts.forEach(function(count)
			{
				response[ count.get("reasonId") ] = count.get("flags");
			});

			res.json(response);
		});
	}

	// Include a flag state in the object, based on the user
	FlagController.includeFlagState = function(include, entityModel, user)
	{
		var flagModel =
			FlagController.getFlagModel(entityModel);

		if(flagModel == null)
			return include;

		var params =
		{
			resolved: FlagController.FLAG_STATE.UNRESOLVED,
		};

		var ReputationController = core.controllers.Reputation;

		// Limit active state display to own flags
		if( !ReputationController.hasPermission(user,
			ReputationController.PERMISSION.VIEW_FLAGS) )
				params[userId] = user.userId;

		include.push
		({
			model: flagModel,
			attributes: ["flagId", "resolved", "userId"],
			where: params,
			required: false,
		});

		return include;
	}

	// Returns true if the relation flag reason id is valid
	FlagController.validateRelationReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2);
	}

	// Returns true if the track edit flag reason id is valid
	FlagController.validateTrackEditReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2);
	}

	// Returns true if the content link flag reason id is valid
	FlagController.validateContentLinkReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2 || reasonId == 3);
	}

	FlagController.init = function()
	{
		app.post("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateRelationReasonId),
			}),
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.CREATE,
					FlagController.ENTITY.RELATION,
					req, res
				);
			});

		app.post("/tracks/:trackId(\\d+)/edits/:editId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateTrackEditReasonId),
			}),
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.CREATE,
					FlagController.ENTITY.TRACK_EDIT,
					req, res
				);
			});

		app.post("/content/:sourceId(\\d+)/:externalId/links/:linkId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateContentLinkReasonId),
			}),
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.CREATE,
					FlagController.ENTITY.CONTENT_LINK,
					req, res
				);
			});

		app.get("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/flags",
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.COUNT,
					FlagController.ENTITY.RELATION,
					req, res
				);
			});

		app.get("/tracks/:trackId(\\d+)/edits/:editId(\\d+)/flags",
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.COUNT,
					FlagController.ENTITY.TRACK_EDIT,
					req, res
				);
			});

		app.get("/content/:sourceId(\\d+)/:externalId/links/:linkId(\\d+)/flags",
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.COUNT,
					FlagController.ENTITY.CONTENT_LINK,
					req, res
				);
			});
	}

	return FlagController;
}
