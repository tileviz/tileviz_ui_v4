To Run the Application On web 

npm install
npx expo install --fix
npx expo start --web

deployment 

npm install -g eas-cli
eas login
npx expo doctor           # Check for issues
npx expo install --fix    # Fix package version mismatches
eas build:configure
eas build -p android --profile preview
eas build -p android --profile production
eas build -p android --profile preview --clear-cache
eas build:list
