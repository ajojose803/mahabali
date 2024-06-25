const passport = require('passport')
const User = require("../model/userModel")
require('dotenv').config();


const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:7000/google/callback",
    passReqToCallback:true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try{
      let user = await User.findOneAndUpdate(
        { email: profile.emails[0].value },
        {$set:{username: profile.displayName,provider:'google',}},
        {upsert:true,new:true}
        );

       return done(null,user); 
       
    }catch(err){
      console.error("Error inserting user:",err);
      return done(err);
    }}

));





passport.serializeUser(function(user, done){
    done(null, user);
  })
  
  passport.deserializeUser(async function(id, done) {
    try {
      let user = await User.findById(id); // Deserialize user from stored ID
      done(null, user); // Pass user object to req.user
    } catch (err) {
      done(err, null);
    }
  });