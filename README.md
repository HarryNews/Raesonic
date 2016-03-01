# Raesonic
Raesonic is a [Node.js](http://nodejs.org) web application for listening to favorite music from [YouTube](https://youtube.com) and [SoundCloud](https://soundcloud.com) sources, and discovering new tracks through user-created recommendations, intended to be accessible at [raesonic.com](https://raesonic.com).

# Screenshots
![Screenshot 1](http://fkids.net/files/projects/raesonic/screenshots/1.png)

![Screenshot 2](http://fkids.net/files/projects/raesonic/screenshots/2.png)

# Running Locally
Raesonic requires [node](http://nodejs.org) and [browserify](https://www.npmjs.com/package/browserify) to build. 

Database and port settings can be changed in the [config.js](/config.js).

Required packages can be installed with

	$ npm install
	$ npm install -g browserify

To bundle the client-side scripts, use

	$ build
	
Now it should be possible to run the server

	$ node raesonic.js
	
The application should now be accessible at [localhost:3000](http://localhost:3000).

# License
[Mozilla Public License 2.0](http://opensource.org/licenses/MPL-2.0)
