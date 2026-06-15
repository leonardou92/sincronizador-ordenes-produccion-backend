import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Igual que DBeaver "SAP kiri": jConnect 16 + ENCRYPT_PASSWORD, sin ServiceName en URL.
 * La BD R3P se selecciona como catálogo tras conectar (DBeaver default-catalog).
 */
public class ConnectionPool {

  private final HikariDataSource dataSource;

  public static ConnectionPool create(
      String host,
      int port,
      String dbName,
      String username,
      String password,
      int minConnections,
      int maxConnections,
      int connectionTimeout,
      int idleTimeout,
      int keepaliveTime,
      int maxLifetime,
      boolean autoCommit)
      throws SQLException {

    HikariConfig config = new HikariConfig();
    config.setDataSourceClassName("com.sybase.jdbc4.jdbc.SybDataSource");
    config.addDataSourceProperty("serverName", host);
    config.addDataSourceProperty("portNumber", port);
    config.addDataSourceProperty("user", username);
    config.addDataSourceProperty("password", password);
    config.addDataSourceProperty("ENCRYPT_PASSWORD", "true");

    if (dbName != null && !dbName.isBlank()) {
      config.addDataSourceProperty("SERVICENAME", dbName);
    }

    config.setIdleTimeout(idleTimeout);
    config.setConnectionTimeout(connectionTimeout);
    config.setMaximumPoolSize(maxConnections);
    config.setMinimumIdle(minConnections);
    config.setKeepaliveTime(keepaliveTime);
    config.setMaxLifetime(maxLifetime);
    config.setAutoCommit(autoCommit);

    HikariDataSource ds = new HikariDataSource(config);
    return new ConnectionPool(ds);
  }

  private ConnectionPool(HikariDataSource ds) {
    this.dataSource = ds;
  }

  public Connection getConnection() throws SQLException {
    return this.dataSource.getConnection();
  }

  public void shutdown() throws SQLException {
    this.dataSource.close();
  }
}
