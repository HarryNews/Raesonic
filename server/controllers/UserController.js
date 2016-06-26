module.exports = function(core)
{
	var PassportStrategy = require("passport-local").Strategy;
	var Crypto = require("crypto-js");
	var Gravatar = require("gravatar");
	
	var UserController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;
	var config = core.config;

	var isSignUpEnabled = config.server.signup;

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
			next(null, user);
		});
	});

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
	UserController.onLogout = function(req, res)
	{
		req.session.destroy();
		res.json( [] );
	}

	UserController.getAccount = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var user = req.user;
		var response =
		[
			user.userId,
			user.username,
			Gravatar.url(
				user.email || user.username,
				{ s: "43", r: "pg", d: "retro" }
			),
			user.reputation
		];

		res.json(response);
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
			UserController.onLogout);

		app.get("/own/account",
			UserController.getAccount);
	}

	return UserController;
}
