# Raesonic
Raesonic is a [Node.js](http://nodejs.org) web application for listening to your favorite tracks on [YouTube](https://youtube.com) and [SoundCloud®](https://soundcloud.com), with the ability to discover and share music through community-oriented features. It is currently available in an early access form at [raesonic.com](https://raesonic.com).

# Screenshots
![Screenshot 1](http://fkids.net/files/projects/raesonic/screenshots/20160726-01.png)

![Screenshot 2](http://fkids.net/files/projects/raesonic/screenshots/20160726-02.png)

# Running Locally
Raesonic requires [node](http://nodejs.org) to run.

Required packages can be installed with

	$ npm install
	$ npm install -g browserify
	$ npm install -g uglify-js

Bundle the client-side scripts (GNU/Linux)

	$ chmod u+x build.sh
	$ ./build.sh 
	
Bundle the client-side scripts (Windows)

	$ build
	
Now it should be possible to run the server

	$ node raesonic.js
	
The application should now be accessible at [localhost:3000](http://localhost:3000).

# Contributions
Join us on [Discord](http://discord.me/Raesonic), if you have any questions, suggestions or feedback.

# License
[Mozilla Public License 2.0](http://opensource.org/licenses/MPL-2.0)
