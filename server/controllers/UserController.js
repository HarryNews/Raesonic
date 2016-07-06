module.exports = function(core)
{
	var PassportStrategy = require("passport-local").Strategy;
	var Crypto = require("crypto-js");
	var EmailValidator = require("email-validator");
	var Gravatar = require("gravatar");
	var Moment = require("moment");
	var RandomString = require("randomstring");
	
	var UserController =
	{
		CONFIRMATION_TOKEN_LENGTH: 20,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;
	var config = core.config;
	var mailer = core.mailer;

	var isSignUpEnabled = config.auth.signup;
	var isVerificationRequired = config.auth.verification;
	var isReputationEnabled = config.auth.reputation;

	var User = sequelize.models.User;
	var Playlist = sequelize.models.Playlist;

	// Handles the account creation requests
	passport.use("signup", new PassportStrategy
	(
		function(username, password, next)
		{
			if(!isSignUpEnabled)
				return next(null, false, "signup disabled");

			password = UserController.encyptPassword(password);

			sequelize.transaction(function(tr)
			{
				return User.findOrCreate
				({
					where: { username: username },
					defaults: { password: password },
					transaction: tr,
				})
				.spread(function(user, created)
				{
					if(!created)
						throw new Error("username not available");

					PlaylistController = core.controllers.Playlist;
					return PlaylistController.createMainPlaylist(user, tr);
				});
			})
			.then(function(user)
			{
				return next(null, user);
			})
			.catch(function(err)
			{
				(err.message == "username not available")
					? next(null, false, err.message)
					: next(err);
			});
		})
	);

	// Handles the authentication requests
	passport.use("login", new PassportStrategy
	(
		function(username, password, next)
		{
			User.findOne
			({
				where: { username: username },
			})
			.then(function(user)
			{
				// Invalid username
				if(!user)
					return next(null, false, "username incorrect");

				// Invalid password
				if(!UserController.equalPasswords(password, user.password))
					return next(null, false, "password incorrect");

				// Authentication successful
				return next(null, user);
			});
		})
	);

	// Configure storing session
	passport.serializeUser(function(user, next)
	{
		next(null, user.userId);
	});

	// Configure retrieving session
	passport.deserializeUser(function(userId, next)
	{
		User.findOne
		({
			where: { userId: userId },
		})
		.then(function(user)
		{
			var isDifferentDay =
				!Moment(user.visitDate).isSame(new Date(), "day");

			if(isDifferentDay)
			{
				user.update
				({
					visitDate: new Date(),
					reputationToday: 0,
					activityToday: 0,
				});
			}

			next(null, user);
		});
	});

	// Returns true if the user has a verified email attached
	UserController.isVerifiedUser = function(user)
	{
		return ( !isVerificationRequired ||
			( !!user.email && !user.emailToken )
		);
	}

	// Obtain account data of the user
	UserController.getAccount = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var user = req.user;

		var hasVerifiedEmail = UserController.isVerifiedUser(user);

		var response =
		[
			user.userId,
			user.username,
			Gravatar.url(
				hasVerifiedEmail
					? user.email
					: user.username,
				{ s: "43", r: "pg", d: "retro" }
			),
			[
				user.email,
				hasVerifiedEmail,
			],
			(isReputationEnabled
				? user.reputation
				: 10000),
		];

		res.json(response);
	}

	// Change email address of the user account
	UserController.setAccountEmail = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var user = req.user;

		User.findOne
		({
			attributes: ["userId", "email", "emailToken"],
			where: { email: req.body.email },
		})
		.then(function(conflictingUser)
		{
			// Unique email address, use it and send confirmation email
			if(!conflictingUser)
				return UserController.attachEmail(user, req.body.email, res);

			// In use on the same account, bail out
			if(conflictingUser.userId == user.userId)
				return res.json({ errors: ["email not changed"] });

			// In use on a verified account, bail out
			if(!conflictingUser.emailToken)
				return res.status(403).json
					({ errors: ["email not available"] });

			// In use on a non-verified account, free the email
			conflictingUser.update
			({
				email: "",
				emailToken: "",
			})
			.then(function()
			{
				// Update the account and send the confirmation email
				UserController.attachEmail(user, req.body.email, res);
			});
		});
	}

	// Resend confirmation email
	UserController.resendConfirmationEmail = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var user = req.user;

		if(!user.email)
			return res.status(401).json({ errors: ["email not attached"] });

		if(!user.emailToken)
			return res.status(401).json({ errors: ["email already verified"] });

		// Generate a new token and send the email
		UserController.attachEmail(user, user.email, res);
	}

	// Attach email to the user account and send a confirmation email
	UserController.attachEmail = function(user, email, res)
	{
		var emailToken = RandomString.generate
			(UserController.CONFIRMATION_TOKEN_LENGTH);

		user.update
		({
			email: email,
			emailToken: emailToken,
		})
		.then(function()
		{
			UserController.sendConfirmationEmail
				(email, user.username, emailToken, res);
		});
	}

	// Send a confirmation email with the verification link
	UserController.sendConfirmationEmail = function(email, username, emailToken, res)
	{
		mailer.sendMail
		({
			from: "Raesonic <" + config.smtp.auth.user + ">",
			to: email,
			subject: "Email Verification - Raesonic",
			text: "Hello!\n" +
				"\n" +
				"You are receiving this message because this email address was " +
					"used for a Raesonic account under the username " +
					"\"" + username + "\".\n" +
				"\n" +
				"If you requested this, please open the following link in your browser " +
					"to verify your email:\n" +
					config.server.url + "/verify/" + emailToken + "/\n" +
				"\n" +
				"If you did not request this, no action is required on your behalf, " +
					"and you may safely ignore this email.\n" +
				"\n" +
				"Raesonic\n"+
				config.server.url,
		},
		function(err, info)
		{
			if(err)
				return res.status(401).json({ errors: ["internal error"] });

			res.json( [] );
		});
	}

	// Verify email confirmation token
	UserController.verifyToken = function(req, res)
	{
		User.findOne
		({
			attributes: ["userId", "emailToken", "reputation"],
			where: { emailToken: req.params.emailToken },
		})
		.then(function(user)
		{
			if(!user)
				return res.redirect("/");

			var params = { emailToken: "" };

			if(user.reputation == -1)
			{
				ReputationController = core.controllers.Reputation;

				params.reputation =
					ReputationController.EMAIL_VALIDATION_REWARD;
			}

			user
			.update(params)
			.then(function()
			{
				res.redirect("/verified/");
			});
		});
	}

	// Returns an encrypted password
	UserController.encyptPassword = function(password)
	{
		return Crypto.PBKDF2(password, config.crypto.salt, { iterations: 1000 }).toString();
	}

	// Returns true if the passwords match
	UserController.equalPasswords = function(input, password)
	{
		return (UserController.encyptPassword(input) == password);
	}

	// Returns true if the username is valid
	UserController.validateUsername = function(username)
	{
		if(username.length < 3 || username.length > 30)
			return false;

		if(!/^[a-z0-9]+$/i.test(username))
			return false;

		return true;
	}

	// Returns true if the password is valid
	UserController.validatePassword = function(password)
	{
		if(password.length < 8 || password.length > 200)
			return false;

		return true;
	}

	// Called upon receiving a result of sign up request
	UserController.onSignUpResult = function(err, user, message, res, req)
	{
		if(err)
			return res.status(401).json({ errors: ["internal error"] });

		if(!user)
			return res.status(401).json({ errors: [message] });

		req.logIn(user, function(logInErr)
		{
			if(logInErr)
				return next(err);

			res.json( [] );
		});
	}

	// Called upon receiving a result of login request
	UserController.onLoginResult = function(err, user, message, res, req)
	{
		if(err)
			return res.status(401).json({ errors: ["internal error"] });

		if(!user)
			return res.status(401).json({ errors: [message] });

		req.logIn(user, function(logInErr)
		{
			if(logInErr)
				return next(err);

			res.json( [] );
		});
	}

	// Called upon logout request
	UserController.logOut = function(req, res)
	{
		req.session.destroy();
		res.json( [] );
	}

	UserController.init = function()
	{
		app.post("/signup",
			paperwork.accept
			({
				username: paperwork.all(String, UserController.validateUsername),
				password: paperwork.all(String, UserController.validatePassword),
			}),
			function(req, res, next)
			{
				passport.authenticate("signup", function(err, user, info)
				{
					UserController.onSignUpResult(err, user, info, res, req);
				})(req, res, next);
			}
		);

		app.post("/login",
			paperwork.accept
			({
				username: paperwork.all(String, UserController.validateUsername),
				password: paperwork.all(String, UserController.validatePassword),
			}),
			function(req, res, next)
			{
				passport.authenticate("login", function(err, user, info)
				{
					UserController.onLoginResult(err, user, info, res, req);
				})(req, res, next);
			}
		);

		app.post("/logout",
			UserController.logOut);

		app.get("/own/account",
			UserController.getAccount);

		app.put("/own/account/email",
			paperwork.accept
			({
				email: paperwork.all(String, EmailValidator.validate),
			}),
			UserController.setAccountEmail);

		app.post("/own/account/email/resend",
			UserController.resendConfirmationEmail);

		app.get("/verify/:emailToken",
			UserController.verifyToken);
	}

	return UserController;
}
