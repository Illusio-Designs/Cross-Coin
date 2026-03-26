const passport = require('passport');
const { User } = require('../model/userModel.js');
const dotenv = require('dotenv');
dotenv.config();

// Only register Google strategy if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/users/auth/google/callback",
      passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
      try {
          let user = await User.findOne({ where: { googleId: profile.id } });

          if (!user) {
              user = await User.create({
                  googleId: profile.id,
                  username: profile.displayName || profile.name.givenName,
                  email: profile.emails[0].value,
                  profileImage: profile.photos[0]?.value || null,
                  role: 'consumer',
                  status: 'active'
              });
          }

          return done(null, user);
      } catch (error) {
          console.error('Google OAuth Error:', error);
          return done(error, null);
      }
  }));
} else {
  console.log('ℹ️  Google OAuth skipped — GOOGLE_CLIENT_ID not configured');
}

// These are required for maintaining sessions
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
