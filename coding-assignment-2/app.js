const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 5;
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        next();
      }
    });
  }
}

app.post("/register/", async (request, response) => {
  console.log("API1");
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}'  
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
        user_id: databaseUser.user_id,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;

  const getStatesQuery = `
    SELECT
    user.username,tweet.tweet,tweet.date_time AS dateTime
    FROM
      (tweet INNER JOIN follower ON tweet.user_id=follower.following_user_id) As T INNER JOIN user ON T.following_user_id=user.user_id where follower.follower_user_id=${user_id} ORDER BY tweet.date_time DESC LIMIT 4;`;
  const statesArray = await database.all(getStatesQuery);
  console.log(statesArray);
  response.send(statesArray);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;
  const getStatesQuery = `
  SELECT user.name
FROM user
INNER JOIN follower ON user.user_id=follower.following_user_id where follower.follower_user_id=${user_id};
    `;
  const statesArray = await database.all(getStatesQuery);
  response.send(statesArray);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;
  const getStatesQuery = `
  SELECT user.name
FROM user
INNER JOIN follower ON user.user_id=follower.follower_user_id where follower.following_user_id=${user_id};
    `;
  const statesArray = await database.all(getStatesQuery);
  response.send(statesArray);
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;
  const { tweetId } = request.params;
  const newQuery = `SELECT tweet, tweet.tweet_id, tweet.date_time as dateTime from ((user INNER JOIN follower ON user.user_id=follower.following_user_id) INNER JOIN tweet ON tweet.user_id=follower.following_user_id) where tweet.tweet_id=${tweetId} and follower.follower_user_id=${user_id}  `;
  const newResult = await database.all(newQuery);
  console.log(newResult);
  if (newResult.length == 0) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    for (let eachObj of newResult) {
      const likeQuery = `
  SELECT count(like_id) as likes
FROM (tweet
INNER JOIN like ON tweet.tweet_id=like.tweet_id) where tweet.tweet_id=${eachObj.tweet_id};
    `;

      const likeArray = await database.get(likeQuery);

      eachObj.likes = likeArray.likes;
      const replyQuery = `
  SELECT count(reply_id) as replies
FROM (tweet
INNER JOIN reply ON tweet.tweet_id=reply.tweet_id) where tweet.tweet_id=${eachObj.tweet_id};
    `;

      const replyArray = await database.get(replyQuery);

      eachObj.replies = replyArray.replies;
      delete eachObj.tweet_id;
      response.send({
        tweet: eachObj.tweet,
        likes: eachObj.likes,
        replies: eachObj.replies,
        dateTime: eachObj.dateTime,
      });
    }
    //response.send(newResult);
  }
});

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { username, user_id } = request.payload;
    const { tweetId } = request.params;
    const newQuery = `SELECT tweet from ((user INNER JOIN follower ON user.user_id=follower.following_user_id) INNER JOIN tweet ON tweet.user_id=follower.following_user_id) where tweet.tweet_id=${tweetId} and follower.follower_user_id=${user_id}  `;
    const newResult = await database.get(newQuery);
    console.log(newResult);
    if (newResult === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      let names_array = [];
      const likeQuery = `
  SELECT username 
FROM (user
INNER JOIN like ON user.user_id=like.user_id) where like.tweet_id=${tweetId};
    `;
      const likeArray = await database.all(likeQuery);
      for (let eachObj of likeArray) {
        names_array.push(eachObj.username);
      }
      response.send({
        likes: names_array,
      });
    }
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { username, user_id } = request.payload;
    const { tweetId } = request.params;
    const newQuery = `SELECT tweet from ((user INNER JOIN follower ON user.user_id=follower.following_user_id) INNER JOIN tweet ON tweet.user_id=follower.following_user_id) where tweet.tweet_id=${tweetId} and follower.follower_user_id=${user_id}  `;
    const newResult = await database.get(newQuery);
    console.log(newResult);
    if (newResult === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      let names_array = [];
      const replyQuery = `
  SELECT name, reply 
FROM (user
INNER JOIN reply ON user.user_id=reply.user_id) where reply.tweet_id=${tweetId};
    `;
      const replyArray = await database.all(replyQuery);
      for (let eachObj of replyArray) {
        names_array.push(eachObj);
      }
      response.send({
        replies: names_array,
      });
    }
  }
);

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;

  const getStatesQuery = `SELECT tweet, tweet.tweet_id, tweet.date_time as dateTime
FROM (user
INNER JOIN tweet ON user.user_id=tweet.user_id) where user.user_id=${user_id};`;
  const statesArray = await database.all(getStatesQuery);
  for (let eachObj of statesArray) {
    const likeQuery = `
  SELECT count(like_id) as likes
FROM (tweet
INNER JOIN like ON tweet.tweet_id=like.tweet_id) where tweet.tweet_id=${eachObj.tweet_id};
    `;

    const likeArray = await database.get(likeQuery);

    eachObj.likes = likeArray.likes;
    const replyQuery = `
  SELECT count(reply_id) as replies
FROM (tweet
INNER JOIN reply ON tweet.tweet_id=reply.tweet_id) where tweet.tweet_id=${eachObj.tweet_id};
    `;

    const replyArray = await database.get(replyQuery);

    eachObj.replies = replyArray.replies;
    delete eachObj.tweet_id;
  }

  response.send(statesArray);
});

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { username, user_id } = request.payload;
  const { tweet } = request.body;
  const dateString = new Date().toISOString();
  const dateTime = dateString.slice(0, 10) + " " + dateString.slice(11, 19);
  const newTweetQuery = `INSERT INTO tweet(tweet, user_id, date_time) VALUES('${tweet}', ${user_id}, '${dateTime}');`;
  await database.run(newTweetQuery);
  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { username, user_id } = request.payload;
    const { tweetId } = request.params;
    const getStatesQuery = `SELECT * FROM tweet where user_id=${user_id} and tweet_id=${tweetId}
;`;
    const statesArray = await database.get(getStatesQuery);
    if (statesArray === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const deleteQuery = `DELETE FROM tweet where user_id=${user_id} and tweet_id=${tweetId}
;`;
      await database.run(deleteQuery);
      response.send("Tweet Removed");
    }
  }
);

module.exports = app;
