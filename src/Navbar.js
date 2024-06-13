import androdebug from "./androdebug.png";
const Navbar = () => {
  return (
    <div>
      <nav className="navbar" style={{ background: "#3559E0", height: 58 }}>
        <div className="container-fluid">
          <span
            className="navbar-fixed-top navbar-brand h1"
            style={{ color: "#EEEDEB", fontFamily: "Apple Color Emoji" }}
          >
            <img
              src={androdebug}
              style={{ height: "2.1em", width: "auto" }}
            ></img>
            {/* <b>ADBWeb</b> */}
          </span>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
