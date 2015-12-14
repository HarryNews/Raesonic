# Raesonic
Raesonic is a [Node.js](http://nodejs.org) web application for listening to favorite music from [YouTube](https://youtube.com) and [SoundCloud](https://soundcloud.com) sources, and discovering new tracks through user-created recommendations, intended to be accessible at [raesonic.com](https://raesonic.com).

# Screenshots
![Screenshot 1](http://fkids.net/files/projects/raesonic/screenshots/1.png)

![Screenshot 2](http://fkids.net/files/projects/raesonic/screenshots/2.png)

# Running Locally
Raesonic requires [node](http://nodejs.org) and [MySQL 5.6.14+](https://dev.mysql.com/downloads/mysql/) to run. 

Database credentials can be edited in [config.js](/config.js).

	$ npm install
	$ node raesonic.js
	
The application should now be accessible at [localhost:3000](http://localhost:3000).

# License
[Mozilla Public License 2.0](http://opensource.org/licenses/MPL-2.0)
