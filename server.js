const http = require('http');
const fs = require('fs');
const { get } = require('https');

/* ============================ SERVER DATA ============================ */
let artists = JSON.parse(fs.readFileSync('./seeds/artists.json'));
let albums = JSON.parse(fs.readFileSync('./seeds/albums.json'));
let songs = JSON.parse(fs.readFileSync('./seeds/songs.json'));

let nextArtistId = 2;
let nextAlbumId = 2;
let nextSongId = 2;

// returns an artistId for a new artist
function getNewArtistId() {
  const newArtistId = nextArtistId;
  nextArtistId++;
  return newArtistId;
}

// returns an albumId for a new album
function getNewAlbumId() {
  const newAlbumId = nextAlbumId;
  nextAlbumId++;
  return newAlbumId;
}

// returns an songId for a new song
function getNewSongId() {
  const newSongId = nextSongId;
  nextSongId++;
  return newSongId;
}

function getArtistAlbums(artistId) {
  const ownAlbums = [];

  for (let key in albums) {
    if (albums[key].artistId.toString() === artistId) {
      ownAlbums.push(albums[key]);
    }
  }

  return ownAlbums;
}

function getArtistSongs(artistId) {
  const ownAlbums = getArtistAlbums(artistId);
  let ownSongs = [];

  for (let album of ownAlbums) {
    ownSongs = [...ownSongs, ...getAlbumSongs(album.albumId.toString())];
  }

  return ownSongs;
}

function getAlbumSongs(albumId) {
  const ownSongs = [];

  for (let key in songs) {
    if (songs[key].albumId.toString() === albumId) {
      ownSongs.push(songs[key]);
    }
  }
  return ownSongs;
}

function getTrackNumberSongs(trackNumber) {
  const ownSongs = [];

  for (let key in songs) {
    if (songs[key].trackNumber.toString() === trackNumber) {
      ownSongs.push(songs[key]);
    }
  }
  return ownSongs;
}


/* ======================= PROCESS SERVER REQUESTS ======================= */
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // assemble the request body
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => { // finished assembling the entire request body
    // Parsing the body of the request depending on the "Content-Type" header
    if (reqBody) {
      switch (req.headers['content-type']) {
        case "application/json":
          req.body = JSON.parse(reqBody);
          break;
        case "application/x-www-form-urlencoded":
          req.body = reqBody
            .split("&")
            .map((keyValuePair) => keyValuePair.split("="))
            .map(([key, value]) => [key, value.replace(/\+/g, " ")])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {});
          break;
        default:
          break;
      }
      console.log(req.body);
    }

    /* ========================== ROUTE HANDLERS ========================== */

    if (req.method === "GET" && req.url === "/artists") {
      res.statusCode = 200;
      res.getHeader("Content-Type", "application/json");
      res.write(JSON.stringify(artists));
      return res.end();
    }

    if (req.method === "POST" && req.url === "/artists") {
      const { name } = req.body;

      let newId = getNewArtistId();
      let newArtist = {
        name: name,
        artistId: newId
      };

      artists[newId] = newArtist;

      res.statusCode = 201;
      res.getHeader("Content-Type", "application/json");
      res.write(JSON.stringify(newArtist));
      return res.end();
    }

    if (req.url.startsWith("/artists")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      let artist = artists[artistId];
      if (artist) {
        // let artist = JSON.parse(JSON.stringify(artists[artistId]));
        // let artist = artists[ar]
        if (urlParts.length === 3) {
          if(req.method === "GET") {
            let resObj = {...artist};
            resObj.albums = getArtistAlbums(artistId);

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify(resObj));
            return res.end();
          }
          else if (req.method === "PATCH") {
            // artist = artists[artistId];
            artist.name = req.body.name || artist.name;

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify(artist));
            return res.end();
          }
          else if (req.method === "DELETE") {
            delete artists[artistId];

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify({ message: "Successfully deleted" }));
            return res.end();
          }
        }
        else if (urlParts.length === 4) {
          if (urlParts[3] === "albums") {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.write(JSON.stringify(getArtistAlbums(artistId)));
              return res.end();
            }
            else if (req.method === "POST") {
              let { name } = req.body;
              let albumId = getNewAlbumId();

              let resObj = {
                name: name,
                albumId: albumId,
                artistId: artistId
              }

              albums[albumId] = resObj;

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 201;
              res.write(JSON.stringify(resObj));
              return res.end();
            }
          }
          else if (urlParts[3] === "songs") {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.write(JSON.stringify(getArtistSongs(artistId)));
              return res.end();
            }
          }
        }
      }
    }
    if (req.url.startsWith("/albums")) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const album = albums[albumId];

      if (album) {
        if (urlParts.length === 3) {
          if (req.method === 'GET'){
            const resObj = {...album};
            // const album = JSON.parse(JSON.stringify(albums[albumId]));
            resObj.artist = artists[album.artistId];
            resObj.songs = getAlbumSongs(albumId);

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify(resObj));
            return res.end();
          }
          else if (req.method === "PATCH") {
            // let { name } = req.body;
            album.name = req.body.name || album.name;
            album.updatedAt = new Date();

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify(album));
            return res.end();
          }
          else if (req.method === "DELETE") {
            delete albums[albumId];

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify({ "message": "Successfully deleted" }));
            return res.end();
          }
        }
        else if (urlParts.length === 4) {
          if (req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.write(JSON.stringify(getAlbumSongs(albumId)));
            return res.end();
          }
          else if (req.method === "POST") {
            const newSong = {...req.body};
            const songId = getNewSongId();
            newSong.songId = songId;
            newSong.albumId = albumId;

            songs[songId] = newSong;

            res.setHeader("Content-Type", "application/json");
            res.statusCode = 201;
            res.write(JSON.stringify(newSong));
            return res.end();
          }
        }
      }
    }
    if (req.url.startsWith("/trackNumbers")) {
      const urlParts = req.url.split("/");
      const trackNumber = urlParts[2];
      // const album = albums[albumId];

      const trackNumberSongs = getTrackNumberSongs(trackNumber);

      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.write(JSON.stringify(trackNumberSongs));
      return res.end();
    }
    if (req.url.startsWith("/songs")) {
      const urlParts = req.url.split("/");
      const songId = urlParts[2];
      const song = songs[songId];

      if (song) {
        if (req.method === "GET") {
          let { albumId } = song;
          let { artistId } = albums[albumId];

          let resObj = {...song};
          resObj.album = albums[albumId];
          resObj.artist = artists[artistId];

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.write(JSON.stringify(resObj));
          return res.end();
        }
        else if (req.method === "PATCH") {
          song.name = req.body.name || song.name;
          song.lyrics = req.body.lyrics || song.lyrics;
          song.trackNumber = req.body.trackNumber || song.trackNumber;

          song.updatedAt = new Date();

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.write(JSON.stringify(song));
          return res.end();
        }
        else if (req.method === "DELETE") {
          delete songs[songId];

          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.write(JSON.stringify({ "message": "Successfully deleted" }));
          return res.end();
        }
      }
    }


    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write("Endpoint not found");
    return res.end();
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => console.log('Server is listening on port', port));
