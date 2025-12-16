import axios from "axios";

async function testLogin() {
  try {
    const res = await axios.post("http://localhost:5000/api/auth/staff-login", {
      email: "staff1@example.com",
      password: "staff123"
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response.data);
  }
}

testLogin();
