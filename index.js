var http       = require('http'),
$              = require('jquery'),
_              = require('underscore'),
async          = require('async'),
sys            = require('sys'),
exec           = require('child_process').exec,
fs             = require('fs'),
getUrlContents = function(url, callback) {
  var data = [];
  http.get(url, function(res) {
    res.on('data', function (response) {
      data.push(response);
    });
    res.on("end", function() {
      callback(data.join().toString());
    });
  });
},
grabData = function(callback, url, selector, titleSelector, descriptionSelector) {
  getUrlContents(url, function(data) {
    var entries = [];

    $(data).find(selector).each(function() {
      var title   = titleSelector ? $(this).find(titleSelector).text() : $(this).text(),
      description = descriptionSelector ? $(this).find(descriptionSelector).text(): '';

      if(title && description)
        entries.push({
          title: title.toLowerCase(),
          description: description.toLowerCase()
        });
    });
    callback(null, entries);
  });
};

async.parallel([
  function(callback) {
    grabData(callback,
      'http://fluentconf.com/fluent2014/public/schedule/presentations',
      '.en_session',
      '.en_session_title a',
      '.en_session_description');
  },
  function(callback) {
    grabData(callback,
      'http://backboneconf.com/',
      '.speaker-entity',
      '.read-more span',
      'p');
  },
  function(callback) {
    grabData(callback,
      'http://html5tx.com/pages/schedule',
      '.talk');
  },
  function(callback) {
    grabData(callback,
      'http://environmentsforhumans.com/2013/javascript-summit/',
      '.abstract',
      'h4',
      'p');
  }
],
// optional callback
function(error, result) {
  var titleWords   = {},
  titles           = [],
  descriptions     = [],
  descriptionWords = {},
  mapToSortedArray = function(data) {
    return _.sortBy(_.map(data, function(value, key) { return [key, value]; }), function(item) {
      return item[1];
    });
  },
  saveDataToFile   = function(data, fileName, callback) {
    fs.writeFile('results/' + fileName + '.txt', data, function(err) {
      if(err) console.log(err);
      else console.log(fileName + ' saved successfully!');
      if(callback) callback();
    });
  },
  getWordFrequency = function(array, sentence) {
    _.each(sentence.split(' '), function(word) {
      array[word]      = array[word] ? array[word] + 1 : 1;
    });
  },
  i, j, word, title, description;

  for(i = result.length - 1; i >= 0; i--) {
    for(j = result[i].length - 1; j >= 0; j--) {
      title       = result[i][j].title;
      description = result[i][j].description;
      titles.push(title);
      descriptions.push(description);
      getWordFrequency(titleWords, title);
      getWordFrequency(descriptionWords, description);
    }
  }

  titleWords       = mapToSortedArray(titleWords);
  descriptionWords = mapToSortedArray(descriptionWords);

  saveDataToFile(_.map(titleWords, function(item) {
    return item[0] + '\t' + item[1] + '\n';
  }).join(''), 'title-words');

  saveDataToFile(_.map(descriptionWords, function(item) {
    return item[0] + '\t' + item[1] + '\n';
  }).join(''), 'description-words');

  saveDataToFile(titles.join('\n'), 'titles', function() {
    var child = exec('python hngen.py results/titles.txt', function (error, stdout, stderr) {
      saveDataToFile(stdout, 'generated-titles');
    });
  });

  saveDataToFile(descriptions.join('\n'), 'descriptions', function() {
    var child = exec('python hngen.py results/descriptions.txt', function (error, stdout, stderr) {
      saveDataToFile(stdout, 'generated-descriptions');
    });
  });
});