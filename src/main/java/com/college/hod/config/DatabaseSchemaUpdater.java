package com.college.hod.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaUpdater {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaUpdater.class);

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void updateDatabaseSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE certificate MODIFY COLUMN status VARCHAR(32)");
            log.info("Ensured certificate.status can store all certificate states.");
        } catch (Exception ex) {
            log.warn("Could not update certificate.status column automatically: {}", ex.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE request MODIFY COLUMN status VARCHAR(32)");
            log.info("Ensured request.status can store all request states.");
        } catch (Exception ex) {
            log.warn("Could not update request.status column automatically: {}", ex.getMessage());
        }

        try {
            Integer columnCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'request'
                      AND COLUMN_NAME = 'rejection_remark'
                    """,
                    Integer.class
            );

            if (columnCount == null || columnCount == 0) {
                jdbcTemplate.execute("ALTER TABLE request ADD COLUMN rejection_remark TEXT");
                log.info("Ensured request.rejection_remark exists for HOD remarks.");
            }
        } catch (Exception ex) {
            log.warn("Could not update request.rejection_remark column automatically: {}", ex.getMessage());
        }

        try {
            Integer columnCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'request'
                      AND COLUMN_NAME = 'hidden_from_pending'
                    """,
                    Integer.class
            );

            if (columnCount == null || columnCount == 0) {
                jdbcTemplate.execute("ALTER TABLE request ADD COLUMN hidden_from_pending BIT(1) NOT NULL DEFAULT b'0'");
                log.info("Ensured request.hidden_from_pending exists for expired cleanup.");
            }
        } catch (Exception ex) {
            log.warn("Could not update request.hidden_from_pending column automatically: {}", ex.getMessage());
        }
    }
}
