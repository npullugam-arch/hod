package com.college.hod.repository;

import com.college.hod.entity.User;
import com.college.hod.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT LOWER(u.username) FROM User u WHERE LOWER(u.username) IN :usernames")
    Set<String> findExistingUsernames(@Param("usernames") Set<String> usernames);

    @Query("SELECT LOWER(u.email) FROM User u WHERE u.email IS NOT NULL AND LOWER(u.email) IN :emails")
    Set<String> findExistingEmails(@Param("emails") Set<String> emails);
}
