
var data = [];

var citynames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
//    prefetch: {
//    url: '/keywords',
//    filter: function(list) {
//      return $.map(list, function(cityname) {
//        return { name: cityname }; });
//    }
//  }


    local: $.map(data, function (city) {
        return {
            name: city
        };
    })
});
citynames.initialize();

$('.category-container > > input').tagsinput({
    typeaheadjs: [{
          minLength: 1,
          highlight: true,
    },{
        minlength: 1,
        name: 'citynames',
        displayKey: 'name',
        valueKey: 'name',
        source: citynames.ttAdapter()
    }],
    freeInput: true
});