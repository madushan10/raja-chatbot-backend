
/*form.addEventListener("submit", () =>{
    if(password.value != confirm_password.value){
        document.getElementById('password-error').style.display = 'block';
        document.getElementById('password-error').textContent = 'Passwords dose not match';
    }
    else{
        document.getElementById('password-error').style.display = 'none';
        document.getElementById('password-error').textContent = ''; 

        const formData = new FormData();
        formData.append("image", document.getElementById("profile_picture").files[0]);
        const adminadd = {
            name: agent_name.value,
            phone: phone.value,
            email: email.value,
            password: password.value,
            formData : formData,
            user_role: 2
        }
       
        fetch("/api/agent-add", {
            method: "post",
            body: JSON.stringify(adminadd),
            headers: {
                "Content-Type" : "application/json"
            }
        }).then(res => res.json())
        .then(data => {
           if(data.status == "failed"){
            success.style.display = "none"
            failed.style.display = "block"
            failed.innerText = data.message
           }
           else{
            success.style.display = "block"
            failed.style.display = "none"
            success.innerText = data.message
           }
        })
    }
    
})
const form = document.getElementById("form");


form.addEventListener("submit", submitForm);

function submitForm(e) {
    e.preventDefault();
    const name = document.getElementById("agent_name").value;
    const phone = document.getElementById("phone").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;
    const profile_picture = document.getElementById("profile_picture");
    
    if(password != confirm_password){
        document.getElementById('password-error').style.display = 'block';
        document.getElementById('password-error').textContent = 'Passwords dose not match';
    }
    else{
        document.getElementById('password-error').style.display = 'none';
        document.getElementById('password-error').textContent = ''; 

    const formData = new FormData();
    formData.append("name", name.value);
    formData.append("phone", phone.value);
    formData.append("email", email.value);
    formData.append("password", password.value);
    formData.append("profile_picture", profile_picture.files[0]);
    console.log( formData);
    fetch("/api/upload", {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data boundary=------WebKitFormBoundaryg7okV37G7Gfll2hf-- ',
        }
    })
        .then((res) => console.log(res))
        .catch((err) => ("Error occured", err));
    }
}*/
function validateAddAgent() {
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;
    if(password != confirm_password){
        document.getElementById('password-error').style.display = 'block';
        document.getElementById('password-error').textContent = 'Passwords dose not match';
        return false;
    }
    else{
        document.getElementById('password-error').style.display = 'none';
        document.getElementById('password-error').textContent = ''; 
    }

}




