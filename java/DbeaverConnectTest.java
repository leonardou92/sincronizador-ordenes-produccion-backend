import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Properties;

/** Prueba directa jConnect — misma forma que DBeaver (sin bridge Node). */
public class DbeaverConnectTest {
  public static void main(String[] args) throws Exception {
    if (args.length < 3) {
      System.err.println("Uso: java DbeaverConnectTest <host> <port> <password>");
      System.exit(1);
    }

    String host = args[0];
    String port = args[1];
    String password = args[2];
    String url = "jdbc:sybase:Tds:" + host + ":" + port;

    Properties props = new Properties();
    props.setProperty("user", "powrbi_roprd");
    props.setProperty("password", password);
    props.setProperty("ENCRYPT_PASSWORD", "true");

    System.out.println("URL: " + url);
    System.out.println("Password length: " + password.length());

    try (Connection conn = DriverManager.getConnection(url, props)) {
      System.out.println("LOGIN OK");
      try (Statement st = conn.createStatement()) {
        st.execute("USE R3P");
        try (ResultSet rs = st.executeQuery("SELECT TOP 1 MATNR FROM SAPSR3.MARM")) {
          if (rs.next()) {
            System.out.println("MARM.MATNR=" + rs.getString(1));
          }
        }
      }
    }
  }
}
