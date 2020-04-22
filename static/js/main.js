$(document).ready(function () {
    comm_init();
    map_init();
    model_init();
    weight_init();

    $(".expand-icon, .header").click(function () {
        $(this).siblings(".inner-container").toggle(200);
        // siblings does not work here, as it could be $(this)
        $(this).parent().children(".expand-icon").text(
            $(this).parent().children(".expand-icon").text() == '+' ? '-' : '+');
    });
    
    // model_selection is initial UI control
    $("#model_selection").children(".expand-icon").click();
});
