console.log('[TileViz] index.ts loading...');

import { registerRootComponent } from 'expo';

import App from './App';

console.log('[TileViz] App imported, registering root component');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

console.log('[TileViz] Root component registered');
