
// Following code adds typeahead keywords to search bars

var keywords = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
    url: '/keywords',
    filter: function(list) {
      return $.map(list, function(cityname) {
        return { name: cityname }; });
    }
  }

});

keywords.initialize();

$('#search').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});

$('#search_page').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});



$('#keywords').tagsinput({
    confirmKeys: [13, 32, 44],
    typeaheadjs: [{
          minLength: 1,
          highlight: true,

    },{
        minlength: 1,
        name: 'keywords',
        displayKey: 'name',
        valueKey: 'name',
        source: keywords.ttAdapter()
    }],
    freeInput: true,

});

window.onload = function() {
  Gifffer({
      playButtonStyles: {
        'width': '60px',
        'height': '60px',
        'border-radius': '30px',
        'background': 'rgba(0, 0, 0, 0.3)',
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'margin': '-30px 0 0 -30px'
      },
      playButtonIconStyles: {
        'width': '0',
        'height': '0',
        'border-top': '14px solid transparent',
        'border-bottom': '14px solid transparent',
        'border-left': '14px solid rgba(255,255,255, 0.5)',
        'position': 'absolute',
        'left': '26px',
        'top': '16px'
      }
    });
}