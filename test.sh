TEST_APP_NAME='RNFetchBlobTest'
TEST_APP_PATH="$(pwd)/${TEST_APP_NAME}"
TARGET='android'
CWD=$(pwd)

if [ "$#" -eq 1 ]; then
  if [ "$1" == 'android' ]; then
    TARGET="$1"
    echo 'start android test'
  elif [ "$1" == 'ios' ]; then
    TARGET="$1"
    echo 'start ios test'
  else
    exit "unrecongized target platform $1, please specify a target platform `ios` or `android`."
  fi
elif [ "$#" -gt 2 ] && [ "$1" == 'path' ]; then
  TEST_APP_PATH="$2"
  TARGET="$3"
  echo "use exist test app path=$2 target=$3"
else
  exit "unrecongized arguments."
fi


# Create new rn project
if [ "$#" -eq 1 ]; then
  echo 'creating test app RNFetchBlobTest ..'
  rm -rf "${TEST_APP_NAME}"
  react-native init "${TEST_APP_NAME}"
fi
# copy js files to test app folder
cp -R test/ "${TEST_APP_PATH}/"

# install module
cd "${TEST_APP_PATH}"
npm install --save "${CWD}/src"
rnpm link

# start RN
cd "${TEST_APP_PATH}"
if [ "$#" == 4 ]; then
  sed -i.bak "s/${TEST_APP_NAME}/$4/" ./index.test.js
fi
react-native "run-${TARGET}"

# install dev packages
cd ${CWD}
npm install
# start test server
cd "${CWD}/test-server"
# kill existing server
kill "$(lsof | grep :8123 | awk '{ printf $2 }')"
node server
