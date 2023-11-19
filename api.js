const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtkey = "temporary_magical_key";
const { userModel } = require("./models/user");
const { conversationModel } = require("./models/conversation");

module.exports = async (app) => {
  app.post("/api/registerUser", async (req, res) => {
    // Grab the username and password from request
    const { username, password } = req.body;

    // Verify information
    if (typeof password != "string" || typeof username != "string")
      return res.json({ status: "bad" });
    if (!password || !username) return res.json({ status: "bad" });
    if (username.includes(" ")) return res.json({ status: "bad" });

    // Encrypt password
    const hashedPassword = bcrypt.hashSync(password, 12);

    try {
      // Create user
      const user = await userModel.create({
        username,
        password: hashedPassword,
      });
      console.log("created new user!");

      // Create token
      const token = jwt.sign({ id: user._id }, jwtkey);
      console.log("created token");

      // Send ok status and token
      res.json({ status: "ok", token: token });
    } catch (e) {
      console.log(e.code);
      res.json({ status: "bad" });
    }
  });

  // Handle user login
  app.post("/api/loginUser", async (req, res) => {
    const { username, password } = req.body;

    // Verify information
    if (typeof password != "string" || typeof username != "string")
      return res.json({ status: "bad" });
    if (!password || !username) return res.json({ status: "bad" });

    // Find user in db
    const user = await userModel.findOne({ username }).lean();

    // if no user was found return with error message
    if (!user) return res.json({ status: "bad" });
    console.log("found user");

    // see if passwords match
    if (!(await bcrypt.compare(password, user.password))) {
      console.log("passwords didnt match");
      return res.json({ status: "bad" });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, jwtkey);
    console.log("created token");

    // Send token
    res.json({ status: "ok", token: token });
  });

  // returns messages of given conversation
  app.post("/api/getMessages", async (req, res) => {
    const { token, conversationId } = req.body;
    console.log("trying to get message");

    // Verify information
    if (!token || !conversationId) {
      console.log("information doesnt exist");
      return res.json({ status: "bad" });
    }

    if (token.typeof != "string" || conversationId.typeof != "string") {
      console.log(token, conversationId, typeof conversationId, typeof token);
      console.log("information doesnt match type");
    }

    try {
      // Get the conversation from id
      const conversation = await conversationModel.findById(conversationId);

      // Get the user
      const user = await getUserFromToken(token);

      // Verify that user is part of conversation
      if (!conversation.users.includes(user._id)) {
        console.log("user is not part of conversation");
        return res.json({ status: "bad" });
      }
      console.log("user is part of conversation");

      // Check if messages have been sent
      if (conversation.messages.length <= 0) return res.json({ status: "bad" });

      console.log("trying to send messages", conversation.messages);
      // Return the messages to client
      return res.json({ status: "ok", messages: conversation.messages });
    } catch (e) {
      console.log("something went wrong with getting messages ", e.code);
      return res.json({ status: "bad" });
    }
  });

  // Add a message to a conversation
  app.put("/api/addMessage", async (req, res) => {
    const { token, conversationId, messageContent } = req.body;

    console.log("Adding new message");

    // Verify information
    if (!token || !conversationId || !messageContent) {
      console.log("data doesnt exist");
      return res.json({ status: "bad" });
    }

    if (
      token.typeof != "string" ||
      conversationId.typeof != "string" ||
      messageContent.typeof != "string"
    ) {
      console.log(token, conversationId, typeof conversationId, typeof token);
      console.log("data doesnt match type");
    }

    try {
      // Get the conversation from id
      const conversation = await conversationModel.findById(conversationId);

      // Get the user
      const user = await getUserFromToken(token);

      // Verify that user is part of conversation
      if (!conversation.users.includes(user._id)) {
        console.log("user is not part of conversation");
        return res.json({ status: "bad" });
      }

      console.log("user is part of conversation");

      // Add new message to conversation
      conversation.messages.push({
        user: user.username,
        content: messageContent,
      });
      await conversation.save();

      console.log("message added");
      console.log(conversation.messages);

      // Send response
      return res.json({ status: "ok", messages: conversation.messages });
    } catch (e) {
      console.log("failed to add message", e.code);
    }
  });

  // Find a user from username
  app.post("/api/getHome", async (req, res) => {
    // Get token from body
    const { token } = req.body;

    // Verify information
    if (typeof token != "string" || !token) return res.json({ status: "bad" });

    try {
      const user = await getUserFromToken(token);
      const conversationPreviews = await getConversationPreviews(user);

      // Return the previews
      return res.json({ status: "ok", conversationPreviews });
    } catch (e) {
      /* handle error */
      console.log(e.code);
      return res.json({ status: "bad" });
    }
  });

  // Find a user from username
  app.post("/api/findUser", async (req, res) => {
    // User name is name of other user
    const { token, username } = req.body;

    // Verify information
    if (typeof username != "string" || typeof token != "string")
      return res.json({ status: "bad" });
    if (!username || !token) return res.json({ status: "bad" });

    try {
      // Find sender in db
      const user = await getUserFromToken(token);

      // Verify that the sender is not looking up themselves
      if (user.username == username) return res.json({ status: "bad" });

      // Find looked up user in db
      const otherUser = await userModel.findOne({ username }).lean();

      // if no users were found return with error message
      if (!otherUser || !user) return res.json({ status: "bad" });

      // Make sure users dont already have a conversation started
      const currentConversation = await conversationModel.find({
        users: {
          $all: [user._id, otherUser._id],
        },
      });

      console.log(currentConversation);

      if (currentConversation.length > 0) {
        console.log("Conversation already exists");
        return res.json({ status: "bad" });
      }

      await conversationModel.create({
        users: [user._id, otherUser._id],
        messages: [],
      });

      const conversationPreviews = await getConversationPreviews(user);
      res.json({ status: "ok", conversationPreviews: conversationPreviews });
    } catch (e) {
      console.log(e.code);
    }
  });

  async function getConversationPreviews(user) {
    let conversationPreviews = [];
    const userConversations = await conversationModel
      .find({ users: user._id })
      .exec();

    for (let conversation of userConversations) {
      let otherUsername = "";

      for (let userId of conversation.users) {
        // find the user thats not the one receiving information and grab their name
        if (userId.toString() != user._id.toString()) {
          console.log(userId, user._id);
          const otherUser = await userModel.findById(userId);
          otherUsername = otherUser.username;
        }
      }

      conversationPreviews.push({
        user: otherUsername,
        id: conversation._id,
      });
    }

    console.log(conversationPreviews);

    return conversationPreviews;
  }

  async function getUserFromToken(token) {
    const user = await userModel.findById(jwt.verify(token, jwtkey).id);
    return user;
  }
};
