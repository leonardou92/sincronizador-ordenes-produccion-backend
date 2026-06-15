import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.Properties;

/** Cliente JDBC Sybase — misma conexión que DBeaver (DriverManager + ENCRYPT_PASSWORD). */
public class SybaseQueryCli {
  public static void main(String[] args) throws Exception {
    if (args.length < 5) {
      System.err.println("Uso: SybaseQueryCli <host> <port> <user> <catalog> <sql>");
      System.exit(1);
    }

    String host = args[0];
    String port = args[1];
    String user = args[2];
    String catalog = args[3];
    String sql = readSql(args[4]);

    String password = System.getenv("SYBASE_PWD");
    if (password == null || password.isEmpty()) {
      throw new IllegalStateException("Variable SYBASE_PWD no definida");
    }

    String url = "jdbc:sybase:Tds:" + host + ":" + port;
    Properties props = new Properties();
    props.setProperty("user", user);
    props.setProperty("password", password);
    props.setProperty("ENCRYPT_PASSWORD", "true");

    try (Connection conn = DriverManager.getConnection(url, props);
        Statement st = conn.createStatement()) {
      if (catalog != null && !catalog.isBlank()) {
        st.execute("USE " + catalog);
      }

      try (ResultSet rs = st.executeQuery(sql)) {
        System.out.print(toJson(rs));
      }
    }
  }

  private static String readSql(String inlineOrDash) throws IOException {
    if (!"-".equals(inlineOrDash)) {
      return inlineOrDash;
    }
    return new String(System.in.readAllBytes(), StandardCharsets.UTF_8).trim();
  }

  private static String toJson(ResultSet rs) throws Exception {
    ResultSetMetaData meta = rs.getMetaData();
    int cols = meta.getColumnCount();
    StringBuilder out = new StringBuilder("[");
    boolean firstRow = true;

    while (rs.next()) {
      if (!firstRow) {
        out.append(',');
      }
      firstRow = false;
      out.append('{');
      for (int i = 1; i <= cols; i++) {
        if (i > 1) {
          out.append(',');
        }
        out.append('"').append(escape(meta.getColumnLabel(i))).append("\":");
        Object value = rs.getObject(i);
        appendJsonValue(out, value);
      }
      out.append('}');
    }

    out.append(']');
    return out.toString();
  }

  private static void appendJsonValue(StringBuilder out, Object value) {
    if (value == null) {
      out.append("null");
      return;
    }
    if (value instanceof Number || value instanceof Boolean) {
      out.append(value);
      return;
    }
    out.append('"').append(escape(String.valueOf(value))).append('"');
  }

  private static String escape(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t");
  }
}
