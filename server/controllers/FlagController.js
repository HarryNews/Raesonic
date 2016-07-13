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
			PROCESS: 3,
		},
		FLAG_STATE:
		{
			RESOLVED_MALICIOUS: -2,
			RESOLVED: -1,
			UNRESOLVED: 0,
			RESOLVED_HELPFUL: 1,
		},
		REASON:
		{
			CLOSE_AND_MARK_MALICIOUS: -1,
			CLOSE_ALL: 0,
		},
		INTENTIONALLY_INCORRECT: 2,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var User = sequelize.models.User;
	var Track = sequelize.models.Track;
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
			case FlagController.ACTION.PROCESS:
			{
				if( !ReputationController.hasPermission(req.user,
					ReputationController.PERMISSION.PROCESS_FLAGS) )
				{
						res.status(403).json
							({ errors: ["not enough reputation"] });

						return false;
				}

				if( !ReputationController.canPerformActivity(req.user,
					ReputationController.ACTIVITY.PROCESS_FLAGS) )
				{
						res.status(403).json
							({ errors: ["exceeded daily activity limit"] });

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
			case FlagController.ACTION.PROCESS:
			{
				FlagController.processFlags
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

	// Process flags of the specified entity, and dismiss the latter
	FlagController.processFlags = function(entity, entityField, entityId, req, res)
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

		var ReputationController = core.controllers.Reputation;
		var reasonId = req.body.reasonId;

		sequelize.transaction(function(tr)
		{
			return ReputationController.addActivity(req.user,
				ReputationController.ACTIVITY.PROCESS_FLAGS,
				tr,
			function onDone()
			{
				if(reasonId < 1)
				{
					// Close the flags without dismissing the entity
					if( reasonId ==
						FlagController.REASON.CLOSE_ALL )
					{
						// Flags are not considered malicious, close them
						return model.update
						({
							resolved:
								FlagController.FLAG_STATE.RESOLVED,
							reviewerId: req.user.userId,
						},
						{
							where: params,
							transaction: tr,
						});
					}

					// Flags are considered malicious, before closing them,
					// adjust reputation of the users who created the flags
					return model.all
					({
						where: params,
						include:
						[{
							model: User,
							as: "User",
							attributes: ["userId", "reputation", "reputationToday"],
						}],
						transaction: tr,
					})
					.then(function(flags)
					{
						if(!flags)
							return res.status(404).json({ errors: ["flags not found"] });

						var users = [];

						flags.forEach(function(flag)
						{
							users.push(flag.User);
						});

						var reputationChange =
							ReputationController.MALICIOUS_FLAG_PENALTY;

						return ReputationController.bulkUpdateReputation
						(users, reputationChange, tr)
						.then(function()
						{
							return model.update
							({
								resolved:
									FlagController.FLAG_STATE.RESOLVED_MALICIOUS,
								reviewerId: req.user.userId,
							},
							{
								where: params,
								transaction: tr,
							});
						})
					});
				}

				// Adjust reputation of users who created the flags
				// with the correct reason, close flags and dismiss the entity
				var paramsWithReason =
				{
					resolved: params.resolved,
					reasonId: reasonId,
				};
				paramsWithReason[entityField] = entityId;

				return model.all
				({
					where: paramsWithReason,
					include:
					[{
						model: User,
						as: "User",
						attributes: ["userId", "reputation", "reputationToday"],
					}],
					transaction: tr,
				})
				.then(function(flags)
				{
					if(flags.length == 0)
					{
						return FlagController.dismissEntity
							(entity, entityField, entityId,
								model, reasonId, tr, req, res);
					}

					var users = [];

					flags.forEach(function(flag)
					{
						users.push(flag.User);
					});

					var reputationChange =
						ReputationController.HELPFUL_FLAG_REWARD;

					return ReputationController.bulkUpdateReputation
					(users, reputationChange, tr)
					.then(function()
					{
						// Close the correct flags and mark them as helpful
						return model.update
						({
							resolved:
								FlagController.FLAG_STATE.RESOLVED_HELPFUL,
							reviewerId: req.user.userId,
						},
						{
							where: paramsWithReason,
							transaction: tr,
						})
						.then(function()
						{
							// Close the remaining flags
							return model.update
							({
								resolved:
									FlagController.FLAG_STATE.RESOLVED,
								reviewerId: req.user.userId,
							},
							{
								where: params,
								transaction: tr,
							})
							.then(function()
							{
								return FlagController.dismissEntity
									(entity, entityField, entityId,
										model, reasonId, tr, req, res);
							});
						});
					})
				});
			});
		})
		.then(function(entity)
		{
			if(!entity)
				return res.json( [] );

			switch(entity.Model)
			{
				case Track:
				{
					return res.json
					([
						entity.trackId,
						entity.artist,
						entity.title,
					]);
				}
				default:
				{
					return res.json( [] );
				}
			}
		})
		.catch(function(err)
		{
			throw err;
			return res.status(500).json({ errors: ["internal error"] });
		});
	}

	// Re-assign the flags and route the entity dismissal request
	FlagController.dismissEntity = function(entity, entityField, entityId, flagModel, reasonId, tr, req, res)
	{
		var params = {};
		params[entityField] = null;

		var where = {};
		where[entityField] = entityId;

		var isMalicious =
			(reasonId == FlagController.INTENTIONALLY_INCORRECT);

		return flagModel.update
		(params,
		{
			where: where,
			transaction: tr,
		})
		.then(function()
		{
			switch(entity.Model)
			{
				case Relation:
				{
					var RelationController = core.controllers.Relation;

					return RelationController.dismissRelation
						(entity, isMalicious, tr);
				}
				case TrackEdit:
				{
					var HistoryController = core.controllers.History;

					return HistoryController.dismissTrackEdit
						(entity, isMalicious, tr);
				}
				default:
				{
					return res.status(500).json({ errors: ["internal error"] });
				}
			}
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
				params.userId = user.userId;

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

	// Returns true if the review reason id is valid
	FlagController.validateReviewReasonId = function(reasonId)
	{
		return (reasonId == -1 || reasonId == 0);
	}

	FlagController.init = function()
	{
		var reasonIdValidators = {};
		reasonIdValidators[FlagController.ENTITY.RELATION] =
			FlagController.validateRelationReasonId;
		reasonIdValidators[FlagController.ENTITY.TRACK_EDIT] =
				FlagController.validateTrackEditReasonId;
		reasonIdValidators[FlagController.ENTITY.CONTENT_LINK] =
				FlagController.validateContentLinkReasonId;

		var endpoints = {};
		endpoints[FlagController.ENTITY.RELATION] =
			"/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/flags";
		endpoints[FlagController.ENTITY.TRACK_EDIT] =
			"/tracks/:trackId(\\d+)/edits/:editId(\\d+)/flags";
		endpoints[FlagController.ENTITY.CONTENT_LINK] =
			"/content/:sourceId(\\d+)/:externalId/links/:linkId(\\d+)/flags";

		Object.keys(FlagController.ENTITY)
		.forEach(function(entityTypeId)
		{
			var entityType = FlagController.ENTITY[entityTypeId];
			var endpoint = endpoints[entityType];

			if(!endpoint)
				return;

			var reasonIdValidator = reasonIdValidators[entityType];

			app.post(endpoint,
				paperwork.accept
				({
					reasonId: paperwork.all(Number, reasonIdValidator),
				}),
				function(req, res)
				{
					FlagController.routeRequest(
						FlagController.ACTION.CREATE,
						entityType, req, res
					);
				});

		app.get(endpoint,
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.COUNT,
					entityType, req, res
				);
			});

		app.post(endpoint + "/process",
			paperwork.accept
			({
				reasonId: paperwork.all(
					Number,
					paperwork.any(
						reasonIdValidator,
						FlagController.validateReviewReasonId
					)
				),
			}),
			function(req, res)
			{
				FlagController.routeRequest(
					FlagController.ACTION.PROCESS,
					entityType, req, res
				);
			});
		});
	}

	return FlagController;
}
