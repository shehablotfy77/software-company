let searchInput = document.getElementById("searchInput");
let countryInfo = document.getElementById("countryInfo");
let searchBtn = document.getElementById("searchBtn");
//event
searchBtn.addEventListener("click" , searchCountry);


// search function
function searchCountry(){

let countryName = searchInput.value.trim(); //remove whtespaces

if(!countryName){
showError('الرجاء ادخال اسم الدوله');
return;
     }

   countryInfo.innerHTML = `<div class='loading'>جاري البحث...</div>`;

    // get api
fetch(`https://countries.dev/name/${countryName}`)
.then(response => {
  if(!response.ok){
    throw new Error('الدوله غير موجوده');

   }
    return response.json();


    })
    
 .then(data => {
   displayCountryInfo(data[0]);

    })
    .catch(error => {
   showError(error.message);

    })
 }





 
 



//عرض معلومات الدوله
function displayCountryInfo(country){
  const currency = Object.values(country.currencies)[0].name;
  const languages = Object.values(country.languages)[0].name;
  countryInfo.innerHTML = `
  <div class="country-card">
  <img src="${country.flags.png}" class='country-flag'>
  <div class='country-details'>
      <h2>${country.name}</h2>
      <div class="detail-item">
      <span class="detail-label">العاصمه:</span>
       <span>${country.capital}</span>
          </div>

          <div class="detail-item">
      <span class="detail-label">عدد السكان:</span>
       <span>${country.population}</span>
          </div>
          <div class="detail-item">
      <span class="detail-label">المنطقه:</span>
       <span>${country.region}</span>
          </div>
          <div class="detail-item">
      <span class="detail-label">اللغات:</span>
       <span>${languages}</span>
          </div>
          <div class="detail-item">
          
      <span class="detail-label">العمله المحليه:</span>
       <span>${currency}</span>
          </div>
     </div>
  </div>
  
  `


}


//error function
function showError(message){
  countryInfo.innerHTML = `<div class="error-message">${message}</div>`


}

