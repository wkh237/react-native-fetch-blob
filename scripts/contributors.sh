
git log --pretty="%an <%ae>" | sort |uniq > CONTRIBUTORS.md
sed -i.bak '/xeiyan@gmail.com/d' ./CONTRIBUTORS.md
rm CONTRIBUTORS.md.bak

echo "list contributors .."

cat CONTRIBUTORS.md

echo "update package.json .."

node -e "var fs = require('fs');\
        var json = JSON.parse(fs.readFileSync('./package.json'));\
        var contributors = String(fs.readFileSync('./CONTRIBUTORS.md')).split(/[\r\n]/);\
        json.contributors = contributors;\
        var distJSON = JSON.parse(fs.readFileSync('./src/package.json'));\
        distJSON.contributors = contributors;\
        fs.writeFileSync('./src/package.json', JSON.stringify(distJSON, null, 2));\
        fs.writeFileSync('./package.json', JSON.stringify(json, null, 2));"

echo "done"
