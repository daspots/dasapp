
function followFunction(x, y) {

    api_url = '/api/v1/follow/' + y + '/';

    if(x.classList.contains("label-default")){
         if(x.classList.contains("not-logged-in")){
//            $("#loginform").css({"visibility":"visible","display":"block"});
            $(".recommender").css({"display":"none"});
            $("#loginform").fadeIn();
//            $("#restaurant").fadeOut();
         } else {

            x.classList.remove("label-default")
            x.classList.add("label-success")
            x.innerHTML='FOLLOWING';
            $.ajax({
                        url: api_url,    //Your api url
                        type: 'PUT',   //type is any HTTP method
                        data: {

                        },      //Data as js object
                        success: function () {
                        }
                    })
                    ;
         }

    } else if(x.classList.contains("label-success")){

        x.classList.remove("label-success")
        x.classList.add("label-default")
        x.innerHTML = 'FOLLOW';
        $.ajax({
                    url: api_url,
                    type: 'DELETE',
                    success: function(result) {
                        // Do something with the result
                    }
                })
                ;
    }

}

$('.close-icon').on('click',function() {
  $(this).closest('.card').css({"display":"none"});
  $(".recommender").fadeIn();
})