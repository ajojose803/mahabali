const passport = require('passport')
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
      let user = await userCollection.findOneAndUpdate(
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
  
  passport.deserializeUser(function(user, done){
    done(null, user);
  })