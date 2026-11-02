// let articleForm = document.getElementById("articleForm");
// let articlesList = document.getElementById("articleList");



// let articles = JASON.parse(localStorage.getItem("articles")) || [];



// // 3) create aarticle

// articleForm.addEventListener("submit" , function(e){
//     e.preventDefault();
// let title = document.getElementById("title").value;
// let content = document.getElementById("content").value;


// let newArticle = {
//     id:Date.now(),
//   title : title,
//   content : content,
// }

// articles.push(newArticle);
// localStorage.setItem("articles" , JASON.stringify(articles));
// articleForm.reset();

// renderArticles();

// })

// // 4) read article

// function renderArticles() {
//   articlesList.innerHTML = articles
//     .map(article => `
//       <div class="article-item card p-3">
//         <div class="d-flex justify-content-between align-items-start">
//           <div>
//             <h5 class="article-title">${article.title}</h5>
//             <p class="article-content">${article.content}</p>
//           </div>

//           <div>
//             <button class="btn btn-warning">
//               <i class="bi bi-pencil"></i>
//             </button>
//           </div>
//         </div>
//       </div>
//     `)
//     .join("");
// }




// 1) get Elements
let articleForm =document.getElementById("articleForm");
let articlesList =document.getElementById("articlesList");
let editModal = new bootstrap.Modal(document.getElementById("editModal"));
let saveChanges = document.getElementById ("saveChanges");

// 2) create db (array)
let articles = JSON.parse(localStorage.getItem("articles")) || [];


// 3) create article
articleForm.addEventListener("submit" , function(e){
  e.preventDefault();
let title = document.getElementById("title").value;
let content = document.getElementById("content").value;


let newArticle = {
  id:Date.now(),
  title : title,
  content : content,
}

articles.push(newArticle);
localStorage.setItem("articles" , JSON.stringify(articles));
articleForm.reset();
renderArticles();
})


// 4) read article
function renderArticles() {
  articlesList.innerHTML = articles
    .map(article => `
      <div class="article-item card p-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="article-title">${article.title}</h5>
            <p class="article-content">${article.content}</p>
          </div>

          <div>
            <button class="btn btn-warning" onclick="editArticle(${article.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteArticle(${article.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `)
    .join("");
}


// 5) Delete article

window.deleteArticle = function(id){
  if(confirm("هل انت متاكد من مسح المقاله؟")){
     articles = articles.filter(a => a.id !== id);
     localStorage.setItem("articles" , JSON.stringify(articles));
     renderArticles();
  }

}

// 6) edit article

window.editArticle = function(id){

   let article = articles.find(a => a.id === id);
   if(article){
    document.getElementById("editId").value = article.id;
    document.getElementById("editTitle").value = article.title;
    document.getElementById("editContent").value = article.content;
    editModal.show();
   }


}

// 7) save operation
saveChanges.addEventListener("click"  , function(){
 let id = parseInt(document.getElementById("editId").value);
 let title = document.getElementById("editTitle").value;
let content = document.getElementById("editContent").value;

let articleIndex = articles.findIndex(a => a.id ===id);

if(articleIndex !== -1){
     articles[articleIndex] = {id , title , content}
     localStorage.setItem("articles" , JSON.stringify(articles));
     renderArticles();
     editModal.hide();
   }
})




renderArticles();