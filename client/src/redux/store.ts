import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import trackReducer from "./tracks";
import artistReducer from "./artists"
const store = configureStore({
  reducer: {
    auth: authReducer,
    tracks: trackReducer,
    artists: artistReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
