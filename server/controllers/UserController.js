module.exports = function(core)
{
	var UserController = {};

	var PassportStrategy = require("passport-local").Strategy;
	var Crypto = require("crypto-js");
	var Gravatar = require("gravatar");
	var PlaylistController = require("./PlaylistController.js")(core);

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;
	var config = core.config;

	var User = sequelize.models.User;
	var Playlist = sequelize.models.Playlist;

	// Handles the account creation requests
	passport.use("signup", new PassportStrategy
	({
		usernameField: "nickname",
	},
	function(nickname, password, next)
	{
		password = UserController.encyptPassword(password);

		User.findOrCreate
		({
			where: { nickname: nickname },
			defaults: { password: password },
		})
		.spread(function(user, created)
		{
			if(!created)
				return next(null, false);

			Playlist.create
			({
				name: "Main",
				userId: user.userId,
			})
			.then(function(playlist)
			{
				next(null, user);
			});
		});
	}));

	// Handles the authentication requests
	passport.use("login", new PassportStrategy
	({
		usernameField: "nickname", 
	},
	function(nickname, password, next)
	{
		User.findOne
		({
			where: { nickname: nickname },
		})
		.then(function(user)
		{
			// Invalid nickname
			if(!user)
				return next(null, false);

			// Invalid password
			if(!UserController.equalPasswords(password, user.password))
				return next(null, false);

			// Authentication successful
			return next(null, user);
		});
	}));

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

	// Called upon logout request
	UserController.onLogout = function(req, res)
	{
		req.session.destroy();
	}

	UserController.getAccount = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var user = req.user;
		var response =
		[
			user.userId,
			user.nickname,
			Gravatar.url(
				user.email || user.nickname,
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

	// Returns true if the nickname is valid
	UserController.validateNickname = function(name)
	{
		if(name.length < 3 || name.length > 30)
			return false;

		// todo: restrict to a-zA-Z0-9 (estimate)

		return true;
	}

	// Returns true if the password is valid
	UserController.validatePassword = function(password)
	{
		if(password.length < 8 || password.length > 200)
			return false;

		return true;
	}

	app.post("/signup",
		paperwork.accept
		({
			nickname: paperwork.all(String, UserController.validateNickname),
			password: paperwork.all(String, UserController.validatePassword),
		}),
		passport.authenticate("signup",
		{
			successRedirect: "/",
		}));

	app.post("/login",
		paperwork.accept
		({
			nickname: paperwork.all(String, UserController.validateNickname),
			password: paperwork.all(String, UserController.validatePassword),
		}),
		passport.authenticate("login",
		{
			successRedirect: "/",
		}));

	app.post("/logout",
		UserController.onLogout);

	app.get("/own/account",
		UserController.getAccount);

	return UserController;
}
